import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { defaultHighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { Compartment, EditorState, Extension } from '@codemirror/state';
import { drawSelection, EditorView, highlightActiveLine, keymap } from '@codemirror/view';
import { vim } from '@replit/codemirror-vim';
import { MarkdownPostProcessorContext, MarkdownRenderChild, Plugin } from 'obsidian';
import { manimEditorTheme } from './editorStyle';
import { getEditorThemeExtension } from './editorThemes';
import { persistManimCode } from './sourcePersistence';
import { ManimEditorTheme } from '../settings';
import { BlockState, saveBlockState } from './stateStore';
import type { ManimEditorFont } from '../settings';

function isVimEnabled(plugin: Plugin): boolean {
	const app = plugin.app as any;
	if (typeof app?.vault?.getConfig === 'function') {
		return Boolean(app.vault.getConfig('vimMode'));
	}
	if (typeof app?.isVimEnabled === 'function') {
		return Boolean(app.isVimEnabled());
	}
	return Boolean((window as any)?.CodeMirrorAdapter?.Vim);
}

export class ManimCodeEditorChild extends MarkdownRenderChild {
	private editorView: EditorView | null = null;
	private saveTimer: number | null = null;
	private hideSavedTimer: number | null = null;
	private themeCompartment = new Compartment();
	private fontCompartment = new Compartment();
	private vimCompartment = new Compartment();

	constructor(
		private readonly plugin: Plugin,
		private readonly ctx: MarkdownPostProcessorContext,
		private readonly contextEl: HTMLElement,
		private readonly editorHostEl: HTMLElement,
		private readonly initialSource: string,
		private readonly saveStateEl: HTMLElement,
		private readonly theme: ManimEditorTheme,
		private readonly savedState?: BlockState,
	) {
		super(editorHostEl);
	}

	onload(): void {
		const vimActive = isVimEnabled(this.plugin);

		const extensions: Extension[] = [
			this.vimCompartment.of(vimActive ? vim() : []),
			history(),
			drawSelection(),
			highlightActiveLine(),
			closeBrackets(),
			manimEditorTheme,
			this.themeCompartment.of(getEditorThemeExtension(this.theme)),
			this.fontCompartment.of(EditorView.theme({
				'.cm-content': {
					fontFamily: `'${(this.plugin as any).settings.editorFontFamily ?? 'JetBrains Mono'}', var(--font-monospace)`,
				},
			})),
			syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
			javascript({ typescript: true }),
			EditorView.lineWrapping,
			EditorState.tabSize.of(4),
			indentUnit.of('    '),
			keymap.of([indentWithTab, ...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap]),
			EditorView.updateListener.of((update) => {
				if (update.docChanged) {
					this.scheduleSave();
				}
				if (update.selectionSet || update.docChanged) {
					this.recordCurrentState();
				}
			}),
		];

		let initialSelection = undefined;
		if (this.savedState?.cursor) {
			const maxPos = this.initialSource.length;
			const anchor = Math.max(0, Math.min(this.savedState.cursor.anchor, maxPos));
			const head = Math.max(0, Math.min(this.savedState.cursor.head, maxPos));
			initialSelection = { anchor, head };
		}

		const state = EditorState.create({
			doc: this.initialSource,
			selection: initialSelection,
			extensions,
		});

		this.editorView = new EditorView({
			state,
			parent: this.editorHostEl,
		});
		this.editorView.dom.classList.add('cm-s-obsidian');

		// Apply initial font family from settings
		this.setEditorFontFamily((this.plugin as any).settings.editorFontFamily ?? 'JetBrains Mono');

		this.editorView.scrollDOM.addEventListener('scroll', () => {
			this.recordCurrentState();
		}, { passive: true });

		if (this.savedState?.scroll) {
			const { top, left } = this.savedState.scroll;
			requestAnimationFrame(() => {
				if (this.editorView) {
					this.editorView.scrollDOM.scrollTop = top;
					this.editorView.scrollDOM.scrollLeft = left;
				}
			});
		}

		if (this.savedState?.hadFocus) {
			requestAnimationFrame(() => {
				if (this.editorView && !this.editorView.hasFocus) {
					this.editorView.focus();
				}
			});
		}

		this.plugin.registerDomEvent(this.editorHostEl, 'pointerdown', () => {
			if (this.editorView && !this.editorView.hasFocus) {
				this.editorView.focus();
			}
			this.recordCurrentState();
		});

		(this.plugin as any).registerActiveEditor?.(this);
	}

	onunload(): void {
		this.recordCurrentState();
		(this.plugin as any).unregisterActiveEditor?.(this);
		if (this.saveTimer !== null) {
			window.clearTimeout(this.saveTimer);
		}
		if (this.hideSavedTimer !== null) {
			window.clearTimeout(this.hideSavedTimer);
		}
		this.editorView?.destroy();
		this.editorView = null;
	}

	recordCurrentState(forceCollapsed?: boolean): void {
		if (!this.editorView) return;
		const sel = this.editorView.state.selection.main;
		const scroll = {
			top: this.editorView.scrollDOM.scrollTop,
			left: this.editorView.scrollDOM.scrollLeft,
		};
		const hadFocus = this.editorView.hasFocus;
		saveBlockState(this.ctx, this.contextEl, {
			cursor: { anchor: sel.anchor, head: sel.head },
			scroll,
			hadFocus,
			...(forceCollapsed !== undefined ? { isCollapsed: forceCollapsed } : {}),
		});
	}

	setEditorTheme(newTheme: ManimEditorTheme): void {
		if (this.editorView) {
			this.editorView.dispatch({
				effects: this.themeCompartment.reconfigure(getEditorThemeExtension(newTheme)),
			});
		}
	}

	setVimEnabled(enabled: boolean): void {
		if (this.editorView) {
			this.editorView.dispatch({
				effects: this.vimCompartment.reconfigure(enabled ? vim() : []),
			});
		}
	}

	setEditorFontFamily(fontFamily: ManimEditorFont): void {
		this.editorHostEl.style.setProperty(
			'--manim-code-font-family',
			`'${fontFamily}', var(--font-monospace)`,
		);
		if (this.editorView) {
			this.editorView.dispatch({
				effects: this.fontCompartment.reconfigure(EditorView.theme({
					'.cm-content': {
						fontFamily: `'${fontFamily}', var(--font-monospace)`,
					},
				})),
			});
		}
	}

	getCode(): string {
		return this.editorView?.state.doc.toString() ?? this.initialSource;
	}

	requestMeasure(): void {
		this.editorView?.requestMeasure();
	}

	async flushPendingSave(): Promise<void> {
		if (this.saveTimer !== null) {
			window.clearTimeout(this.saveTimer);
			this.saveTimer = null;
		}
		await this.persistChanges();
	}

	private setSaveState(text: string): void {
		this.saveStateEl.textContent = text;
		this.saveStateEl.style.display = text ? 'inline-block' : 'none';
	}

	private scheduleSave(): void {
		this.setSaveState('Saving...');
		if (this.saveTimer !== null) {
			window.clearTimeout(this.saveTimer);
		}
		const delayMs = ((this.plugin as any).settings.autoSaveDelaySeconds ?? 60) * 1000;
		this.saveTimer = window.setTimeout(() => {
			this.saveTimer = null;
			void this.persistChanges();
		}, delayMs);
	}

	private async persistChanges(): Promise<void> {
		this.recordCurrentState();
		await persistManimCode(this.plugin, this.ctx, this.contextEl, this.getCode());
		this.setSaveState('Saved');
		if (this.hideSavedTimer !== null) {
			window.clearTimeout(this.hideSavedTimer);
		}
		this.hideSavedTimer = window.setTimeout(() => {
			this.hideSavedTimer = null;
			this.setSaveState('');
		}, 1000);
	}
}
