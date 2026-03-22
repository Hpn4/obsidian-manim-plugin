import { MarkdownPostProcessorContext, Plugin, TFile } from 'obsidian';

function buildManimFenceFromSection(sectionText: string, code: string): string {
	const openingFence = sectionText.match(/^```manim[^\n]*/m)?.[0] ?? '```manim';
	return `${openingFence}\n${code}\n\`\`\``;
}

function replaceSectionByLineRange(fullText: string, lineStart: number, lineEnd: number, replacement: string): string {
	const lines = fullText.split('\n');
	const safeStart = Math.max(0, lineStart);
	const safeEnd = Math.max(safeStart, lineEnd);
	lines.splice(safeStart, safeEnd - safeStart + 1, ...replacement.split('\n'));
	return lines.join('\n');
}

export async function persistManimCode(
	plugin: Plugin,
	ctx: MarkdownPostProcessorContext,
	contextEl: HTMLElement,
	code: string,
): Promise<void> {
	const sectionInfo = ctx.getSectionInfo(contextEl);
	if (!sectionInfo) {
		return;
	}

	const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(file instanceof TFile)) {
		return;
	}

	const original = await plugin.app.vault.cachedRead(file);
	const updatedSection = buildManimFenceFromSection(sectionInfo.text, code);
	const updatedDoc = replaceSectionByLineRange(original, sectionInfo.lineStart, sectionInfo.lineEnd, updatedSection);

	if (updatedDoc !== original) {
		await plugin.app.vault.modify(file, updatedDoc);
	}
}
