import { EditorView } from '@codemirror/view';

export const manimEditorTheme = EditorView.theme({
	'&': {
		backgroundColor: 'var(--manim-code-background, var(--code-background, var(--background-primary)))',
		color: 'var(--manim-code-color, var(--code-normal, var(--text-normal)))',
	},
	'.cm-content': {
		caretColor: 'var(--manim-caret-color, var(--caret-color, var(--text-normal)))',
	},
	'.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
		backgroundColor: 'var(--manim-selection-color, var(--text-selection)) !important',
	},
	'.cm-cursor, .cm-dropCursor': {
		borderLeftColor: 'var(--manim-caret-color, var(--caret-color, var(--text-normal)))',
	},
});

function setVarFromComputed(host: HTMLElement, name: string, element: Element | null, property: string): void {
	if (!(element instanceof HTMLElement)) {
		return;
	}
	const value = getComputedStyle(element).getPropertyValue(property);
	if (value.trim()) {
		host.style.setProperty(name, value);
	}
}

export function syncStylesFromNativeCodeMirror(hostEl: HTMLElement): void {
	// Mirror typography/colors from the currently visible native CM6 editor.
	const nativeEditor = document.querySelector('.markdown-source-view.mod-cm6 .cm-editor');
	const nativeContent = document.querySelector('.markdown-source-view.mod-cm6 .cm-editor .cm-content');
	const nativeSelection = document.querySelector('.markdown-source-view.mod-cm6 .cm-editor .cm-selectionBackground');
	const nativeCursor = document.querySelector('.markdown-source-view.mod-cm6 .cm-editor .cm-cursor');

	setVarFromComputed(hostEl, '--manim-code-background', nativeEditor, 'background-color');
	setVarFromComputed(hostEl, '--manim-code-color', nativeContent, 'color');
	setVarFromComputed(hostEl, '--manim-code-font-family', nativeContent, 'font-family');
	setVarFromComputed(hostEl, '--manim-code-font-size', nativeContent, 'font-size');
	setVarFromComputed(hostEl, '--manim-code-line-height', nativeContent, 'line-height');
	setVarFromComputed(hostEl, '--manim-code-letter-spacing', nativeContent, 'letter-spacing');
	setVarFromComputed(hostEl, '--manim-code-font-weight', nativeContent, 'font-weight');
	setVarFromComputed(hostEl, '--manim-selection-color', nativeSelection, 'background-color');
	setVarFromComputed(hostEl, '--manim-caret-color', nativeCursor, 'border-left-color');
}
