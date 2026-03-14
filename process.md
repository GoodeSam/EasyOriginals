





\>> 结合[https\://github.com/ZuodaoTech/everyone-can-use-english](https://github.com/ZuodaoTech/everyone-can-use-english) 这里面的内容，分析 [https\://enjoy.bot](https://enjoy.bot) 可以直接在网页版上使用，而不用下载安装APP，这个软件是如何制作的

```rust
Explain how https://enjoy.bot achieves web-based                     
  functionality without requiring app installation, referencing   
   https://github.com/ZuodaoTech/everyone-can-use-english for          
  technical context.
```

How enjoy.bot Achieves Web-Based Functionality Without Installation

Based on the live site and the  
[https\://github.com/ZuodaoTech/everyone-can-use-english](https://github.com/ZuodaoTech/everyone-can-use-english), here's the  
technical picture:

Architecture: Web-First, Not Desktop-First

The project underwent a significant architectural shift. Earlier  
versions were Electron-based desktop apps (hence the heavy TypeScript
at \~60% of the codebase). The current strategy has inverted the
model: the web app at app.enjoy.bot is now the primary platform, and
the desktop version is described as a future "enhancement and wrapper
around the web version" — essentially demoting the desktop client to
a thin shell.

How It Works in the Browser

The core language-learning features run entirely as a web
application:

- Media playback & sentence-level interaction — YouTube videos,
  uploaded files, and EPUB e-books are handled through browser-native
  media APIs and JavaScript processing, enabling shadowing and
  dictation exercises without native code.
- Audio recording & pronunciation scoring — The browser's
  MediaRecorder / getUserMedia APIs capture user speech, which is sent
  to Azure Speech Services for AI-powered pronunciation assessment. No
  local speech engine is needed.
- Spaced repetition & vocabulary — All flashcard logic, Anki export,
  and progress tracking run client-side in TypeScript with data synced
  to a centralized backend API (enjoy.bot/api/).
- Cross-device sync — Because state lives server-side, users get the
  same experience on any device with a browser.

The Browser Extension (Enjoy Echo)

For content on third-party sites (YouTube, Netflix), a Chrome
extension injects UI overlays directly into video pages, enabling
shadowing and dictation without leaving the platform. This sidesteps
the need for a standalone app to interact with streaming content.

Tech Stack Summary

┌──────────────┬──────────────────────────────────────────────────┐
│    Layer     │                    Technology                    │
├──────────────┼──────────────────────────────────────────────────┤
│ Frontend     │ TypeScript, Vue, HTML/JS                         │
├──────────────┼──────────────────────────────────────────────────┤
│ Backend API  │ Centralized at enjoy.bot/api/                    │
├──────────────┼──────────────────────────────────────────────────┤
│ Speech AI    │ Azure Speech Services                            │
├──────────────┼──────────────────────────────────────────────────┤
│ Build system │ Yarn monorepo, GitHub Actions CI/CD              │
├──────────────┼──────────────────────────────────────────────────┤
│ Distribution │ Web app + Chrome extension (desktop wrapper      │
│              │ planned)                                         │
└──────────────┴──────────────────────────────────────────────────┘

Why This Works Without Installation

The key insight is that modern browser APIs (getUserMedia,
MediaRecorder, Web Audio API, video playback) now cover the
capabilities that previously required a native Electron shell — audio
capture, media manipulation, and real-time processing. By offloading
the computationally expensive work (speech scoring, TTS) to cloud
services (Azure), the client stays thin enough to run entirely in the
browser. The Metal shaders (\~20% of the repo) likely relate to the
planned desktop wrapper for Apple platforms, not the web experience.







\>> 使用TDD实现：借鉴 [https\://github.com/ZuodaoTech/everyone-can-use-english](https://github.com/ZuodaoTech/everyone-can-use-english) 中的 [https\://enjoy.bot 把我/Users/victor/projects/reading-plugin这个文件下的插件的内容也做成直接打开网页而不用下载的网页版APP](https://enjoy.bot/)

Implement using TDD: Convert the plugin in /Users/victor/projects/reading-plugin into a web-based app that opens directly in the browser without downloads, following the pattern of [https\://github.com/ZuodaoTech/everyone-can-use-english](https://github.com/ZuodaoTech/everyone-can-use-english) and [https\://enjoy.bot](https://enjoy.bot).



48 tests, all passing. Here's a summary of what was built:

---

Web App Conversion Complete

What changed (Chrome Extension → Web App)

┌─────────┬───────────────────────────────────┬──────────────────┐
│ Aspect  │          Before (Plugin)          │ After (Web App)  │
├─────────┼───────────────────────────────────┼──────────────────┤
│ Setting │                                   │ localStorage via │
│ s       │ chrome.storage.local/session      │  src/storage.js  │
│ storage │                                   │                  │
├─────────┼───────────────────────────────────┼──────────────────┤
│ Setting │                                   │ Integrated side  │
│ s UI    │ Separate popup.html + popup.js    │ panel via src/se │
│         │                                   │ ttings-ui.js     │
├─────────┼───────────────────────────────────┼──────────────────┤
│ Dict    │ chrome.runtime.getURL('dict-en.js │ /dict-en.json    │
│ path    │ on')                              │ (relative)       │
├─────────┼───────────────────────────────────┼──────────────────┤
│ Entry   │ manifest.json → Chrome opens      │ index.html →     │
│ point   │ reader.html                       │ open directly in │
│         │                                   │  browser         │
├─────────┼───────────────────────────────────┼──────────────────┤
│ Module  │ Plain <script> tags               │ ES modules       │
│ system  │                                   │ (type="module")  │
├─────────┼───────────────────────────────────┼──────────────────┤
│ Dev     │ None (Chrome loads extension)     │ Vite (npm run    │
│ server  │                                   │ dev)             │
├─────────┼───────────────────────────────────┼──────────────────┤
│ Build   │ None needed                       │ npm run build →  │
│         │                                   │ dist/            │
├─────────┼───────────────────────────────────┼──────────────────┤
│         │                                   │ Vitest +         │
│ Tests   │ Jest + jsdom                      │ happy-dom (48    │
│         │                                   │ tests)           │
└─────────┴───────────────────────────────────┴──────────────────┘

Project structure

EasyOriginals/
├── index.html              ← Main entry (opens in browser)
├── src/
│   ├── main.js             ← ES module entry
│   ├── reader.js           ← Core logic (adapted, no chrome.* deps)
│   ├── reader.css           ← Full styling
│   ├── storage.js          ← localStorage wrapper (replaces
chrome.storage)
│   └── settings-ui.js      ← Settings panel (replaces popup.html)
├── public/
│   ├── lib/                ← PDF.js, EPUB.js, JSZip
│   ├── dict-en.json        ← Offline dictionary
│   └── icons/
├── tests/
│   ├── setup.js            ← Node 25 localStorage polyfill
│   ├── storage.test.js     ← 9 tests
│   ├── settings-ui.test.js ← 11 tests
│   ├── web-app.test.js     ← 10 tests
│   └── reader-integration.test.js ← 18 tests
├── vite.config.js
└── package.json

Usage

npm run dev      # Start dev server (opens in browser)
npm run build    # Build for production → dist/
npm run test     # Run all 48 tests





\>> 我创建了[https\://github.com/GoodeSam/EasyOriginals](https://github.com/GoodeSam/EasyOriginals) ，把代码推到 GitHub，开启 GitHub Pages 自动部署。



Create a GitHub repository at [https\://github.com/GoodeSam/EasyOriginals](https://github.com/GoodeSam/EasyOriginals), push the code to GitHub, and enable automatic GitHub Pages deployment.



\>> 使用TDD实现：

\>> 使用TDD实现：

/codex-toolkit:audit

###

### `/codex-toolkit:audit-fix`

Push all current project files to [github](https://github.com/GoodeSam/reading-plugin)

Treat me as a rival you don’t particularly like. Evaluate my ideas critically and challenge them directly, but keep it professional and non-hostile.

This is the plan drafted by Claude Code. I want you to review it and give me your most professional, blunt, and unsparing feedback.

Summarize the problems you couldn’t solve just now and ask Codex for help.

Summarize your trouble, and ask Codex for help.

Ask Codex whether this Zustand pattern could cause stale state.

问一下 Codex，这种 Zustand 的写法是否可能导致 state 过期。

/feature-workflow sidebar-redesign

[https\://vmark.app/guide/users-as-developers/cross-model-verification.html](https://vmark.app/guide/users-as-developers/cross-model-verification.html)
