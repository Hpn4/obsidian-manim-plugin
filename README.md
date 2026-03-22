# Manim Plugin for Obsidian

Create and edit **Manim animations** directly in your Obsidian notes with a live editor, instant rendering, and full TypeScript support.

## Features

- **Inline Editor**: Embedded CodeMirror editor with syntax highlighting, supporting TypeScript annotations
- **Live Preview**: Render animations instantly inside your notes
- **Auto-save**: Changes automatically persist to your markdown source
- **Theme Selector**: Choose from 5 color themes (GitHub Light/Dark, Monokai, One Dark, Obsidian)
- **Error Debugging**: Detailed error panels with full stack traces for quick troubleshooting
- **TypeScript Support**: Write TS annotations in manim code (automatically transpiled)
- **Responsive Design**: Beautiful, fully-responsive layout for desktop and mobile

## Quick Start

### 1. Install the plugin
- Search for "Manim Plugin" in Obsidian's community plugins
- Click **Install** and **Enable**

### 2. Create a manim code block
Write in your markdown:

````markdown
```manim
const { Scene, Circle } = manimWeb;

export default class MyScene extends Scene {
  async construct() {
    const circle = new Circle({ radius: 2 });
    await this.add(circle);
  }
}
```
````

### 3. Edit and render
- Click **Run** in the block header to render
- Edit code directly in the embedded editor
- Changes auto-save to markdown

## Syntax

The API follows **[manim-web](https://github.com/algoritmist/manim-web)** – a browser-based animation library.

### Basic Example
```js
const { Scene, Circle, GREEN } = manimWeb;

export default class MyScene extends Scene {
  async construct() {
    const circle = new Circle({ color: GREEN });
    await this.play(circle.animationsCreate());
    await this.wait(1);
  }
}
```

### Export
You must export a class extending `Scene` with an async `construct()` method.

## Settings

**Editor Theme**
- Obsidian (default, synced with your vault's theme)
- GitHub Light / Dark
- Monokai  
- One Dark

Access via **Settings → Community Plugins → Manim Plugin**.

## TypeScript Support

Use TypeScript annotations in your code – they're automatically transpiled:

```ts
const { Scene } = manimWeb;

export default class Example extends Scene {
  async construct() {
    const x: number = 10;
    const name: string = "animation";
  }
}
```

## Troubleshooting

**Code won't render?**
- Check the **Error Panel** below the canvas for detailed stack traces
- Ensure your class extends `Scene` and exports as default
- Verify all `manimWeb` imports are valid

**Style issues?**
- Your editor style syncs from Obsidian's native CodeMirror
- Try changing themes in settings if it doesn't match your vault theme

**Performance?**
- Large animations can be slow on low-end devices
- Simpler scenes render faster; test with small examples first

## Development

Built with:
- **[CodeMirror 6](https://codemirror.net/)** – advanced code editor
- **[manim-web](https://github.com/algoritmist/manim-web)** – browser animation runtime
- **Obsidian Plugin API**

## Roadmap

- [ ] **Auto-completions** for manim-web API (Scene, Circle, animations, colors)
- [ ] **Demo screenshots & GIFs** showcasing editor, rendering, and themes
- [ ] Improved cursor handling in code editor
- [ ] Export animations to HTML/MP4

## License

BSD-0 (see LICENSE)

## Contributing

Issues and pull requests welcome on [GitHub](https://github.com/Hpn4/obsidian-manim-plugin).
