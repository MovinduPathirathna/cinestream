# CineStream 🎬🍿

A modern, high-performance Netflix-style streaming web app built with Vanilla HTML5, CSS3, and JavaScript. Designed specifically to be hosted directly on **GitHub Pages**.

## Features 🚀

- 🍿 **Netflix-Inspired UI**: Beautiful dark theme, dynamic hero backdrop, horizontal scroll carousels, responsive grid layouts.
- 🎬 **Movies & TV Shows**: Separate sections for Movies, TV Shows, Trending, Popular, Top Rated, and Genre filtering.
- 🔍 **Real-Time Search**: Search any movie or TV show instantly.
- 🎯 **Smart Recommendations**: "Suggested For You" row generated automatically based on your watch history.
- 📺 **Multi-Server Player**: High quality streaming sources (VidLink, Embed.su, VidSrc.cc, VidSrc.me) with automatic fallback.
- 🛡️ **Built-in Ad-Blocking**: Strict iframe sandboxing security policies block popup ads, unwanted redirects, and spam windows.
- 💬 **Multi-Language Subtitles**: Direct access to servers with native subtitle support (English, Spanish, French, German, Hindi, Arabic, and more).
- 📌 **My List & Watch History**: Save your favorite titles and track episode progress locally in your browser.
- ⚙️ **Custom API Key Support**: Works out-of-the-box with a default TMDB key, or use your own custom key in Settings.

---

## How to Host on GitHub Pages (2-Minute Setup) 🌐

1. **Create a GitHub Repository**:
   - Go to [GitHub New Repository](https://github.com/new).
   - Name it `cinestream` (or any name you prefer).
   - Keep it **Public**.

2. **Upload Files**:
   - Upload all the files in this directory (`index.html`, `css/`, `js/`, `.nojekyll`, `README.md`) to your repository.

3. **Enable GitHub Pages**:
   - In your repository, click **Settings** > **Pages** (in the left sidebar).
   - Under **Build and deployment** -> **Branch**, select `main` (or `master`) and folder `/ (root)`.
   - Click **Save**.

4. **Enjoy your site!** 🎉
   - GitHub will generate your site link: `https://<your-username>.github.io/cinestream/`

---

## Local Development 💻

To test locally without uploading:
```bash
python -m http.server 8765
```
Then open `http://localhost:8765` in your browser.
