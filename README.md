# Understandly

Simple educational scaffold for GitHub Pages. Static sections with anchors so it works without JavaScript; you can wire up interactivity in `main.js` later.

Structure
- `index.html`: Home, Subjects, CS overview, Variables lesson, Quiz (static), Mini Project.
- `styles.css`: Minimal styling for layout, buttons, cards, and code blocks.
- `main.js`: Commented scaffold only (you implement logic).
- `404.html`: Basic not-found page (anchors don’t need SPA redirect).

How to add the quiz logic (suggestion)
1) Show/hide sections based on `location.hash`.
2) On “Check Answers”, read selected radio values for q1..q5 and compare to the correct answers stored in the DOM (see the `data-answer` attributes) or in a JS object.
3) Render a score and optionally allow retry.

Local testing
Use any static server to preview. For example with Python 3:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080/

Deploy on GitHub Pages
- Push to `main` and enable Pages for the repo (Settings → Pages → Deploy from branch → `main` / root).
- Because this uses anchor links (e.g., `#cs-quiz`), it works fine without special SPA routing.
