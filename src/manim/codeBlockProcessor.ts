import { Notice, setIcon } from 'obsidian';
import { ManimCodeEditorChild } from './editorChild';
import { syncStylesFromNativeCodeMirror } from './editorStyle';
import { runManimSource } from './runtime';
import type MyPlugin from '../main';

function formatRuntimeError(error: unknown): string {
	if (error instanceof Error) {
		const stack = error.stack?.trim();
		return stack ? `${error.name}: ${error.message}\n\n${stack}` : `${error.name}: ${error.message}`;
	}
	return String(error);
}

function setCollapsedState(codeEditorEl: HTMLElement, collapseCaretEl: HTMLElement, collapsed: boolean): void {
	codeEditorEl.style.display = collapsed ? 'none' : 'block';
	collapseCaretEl.textContent = collapsed ? '▸' : '▾';
	collapseCaretEl.setAttribute('aria-label', collapsed ? 'Expand code' : 'Collapse code');
}

export function registerManimCodeBlockProcessor(plugin: MyPlugin): void {
	plugin.registerMarkdownCodeBlockProcessor('manim', async (source, el, ctx) => {
		const wrapper = el.createDiv({ cls: 'manim-block' });
		syncStylesFromNativeCodeMirror(wrapper);

		const header = wrapper.createDiv({ cls: 'manim-block-header' });
		const collapseCaret = header.createSpan({ cls: 'manim-collapse-caret', text: '▾' });
		collapseCaret.setAttribute('role', 'button');
		collapseCaret.setAttribute('tabindex', '0');

		const controls = header.createDiv({ cls: 'manim-block-controls' });
		const saveState = controls.createSpan({ cls: 'manim-save-state' });
		saveState.style.display = 'none';

		const runButton = controls.createEl('button', { cls: 'manim-control-button manim-run-button' });
		runButton.type = 'button';
		setIcon(runButton, 'play');
		runButton.createSpan({ cls: 'manim-run-label', text: 'Run' });

		// Reuse Obsidian's CM6 container classes so native editor styles apply.
		const codeEditor = wrapper.createDiv({ cls: 'manim-code-editor markdown-source-view mod-cm6' });
		const editorChild = new ManimCodeEditorChild(
			plugin,
			ctx,
			el,
			codeEditor,
			source,
			saveState,
			plugin.settings.editorTheme,
		);
		ctx.addChild(editorChild);

		const canvas = wrapper.createDiv({ cls: 'manim-canvas' });
		const errorPanel = wrapper.createEl('pre', { cls: 'manim-error-panel' });
		errorPanel.style.display = 'none';

		let isCollapsed = false;
		setCollapsedState(codeEditor, collapseCaret, isCollapsed);

		const toggleCollapse = () => {
			isCollapsed = !isCollapsed;
			setCollapsedState(codeEditor, collapseCaret, isCollapsed);
		};

		plugin.registerDomEvent(collapseCaret, 'click', (evt: MouseEvent) => {
			evt.preventDefault();
			evt.stopPropagation();
			toggleCollapse();
		});

		plugin.registerDomEvent(collapseCaret, 'keydown', (evt: KeyboardEvent) => {
			if (evt.key !== 'Enter' && evt.key !== ' ') {
				return;
			}
			evt.preventDefault();
			toggleCollapse();
		});

		plugin.registerDomEvent(header, 'click', (evt: MouseEvent) => {
			const target = evt.target as HTMLElement;
			if (target.closest('.manim-run-button')) {
				return;
			}
			toggleCollapse();
		});

		const execute = async () => {
			saveState.textContent = 'Running...';
			saveState.style.display = 'inline-block';
			errorPanel.style.display = 'none';
			errorPanel.textContent = '';
			runButton.disabled = true;

			try {
				await editorChild.flushPendingSave();
				await runManimSource(editorChild.getCode(), canvas);
				saveState.textContent = '';
				saveState.style.display = 'none';
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				saveState.textContent = '';
				saveState.style.display = 'none';
				errorPanel.textContent = formatRuntimeError(error);
				errorPanel.style.display = 'block';
				new Notice(`Manim render failed: ${message}`);
			} finally {
				runButton.disabled = false;
			}
		};

		plugin.registerDomEvent(runButton, 'click', (evt: MouseEvent) => {
			evt.preventDefault();
			evt.stopPropagation();
			void execute();
		});

		void execute();
	});
}
