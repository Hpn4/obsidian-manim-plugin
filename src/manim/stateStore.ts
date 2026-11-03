import { MarkdownPostProcessorContext } from 'obsidian';

export interface BlockState {
	isCollapsed: boolean;
	cursor?: { anchor: number; head: number };
	scroll?: { top: number; left: number };
	hadFocus?: boolean;
	timestamp: number;
}

// Map from unique block key to its state
const blockStateCache = new Map<string, BlockState>();

// Map from file path to the most recently active block state in that file
const lastActiveBlockByFile = new Map<string, BlockState>();

export function getBlockKey(ctx: MarkdownPostProcessorContext, el: HTMLElement): string {
	const sectionInfo = ctx.getSectionInfo(el);
	if (sectionInfo) {
		return `${ctx.sourcePath}::line:${sectionInfo.lineStart}`;
	}
	return `${ctx.sourcePath}::el:${el.id || 'default'}`;
}

export function saveBlockState(
	ctx: MarkdownPostProcessorContext,
	el: HTMLElement,
	updates: Partial<BlockState>,
): void {
	const key = getBlockKey(ctx, el);
	const existing = blockStateCache.get(key) ?? {
		isCollapsed: false,
		timestamp: Date.now(),
	};

	const merged: BlockState = {
		...existing,
		...updates,
		timestamp: Date.now(),
	};

	blockStateCache.set(key, merged);
	lastActiveBlockByFile.set(ctx.sourcePath, merged);
}

export function getPersistedBlockState(
	ctx: MarkdownPostProcessorContext,
	el: HTMLElement,
): BlockState | undefined {
	const key = getBlockKey(ctx, el);
	const state = blockStateCache.get(key);
	if (state !== undefined) {
		return state;
	}

	// Fallback: if sectionInfo wasn't available or line shifted slightly, check if there's a recent active block in the same file (within last 30 seconds)
	const recent = lastActiveBlockByFile.get(ctx.sourcePath);
	if (recent && Date.now() - recent.timestamp < 30000) {
		return recent;
	}

	return undefined;
}
