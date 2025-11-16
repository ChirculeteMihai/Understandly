// Understandly minimal app logic: hash routing + quiz scoring
document.addEventListener("DOMContentLoaded", () => {
	// Simple hash-based section router
	const sections = Array.from(document.querySelectorAll("main .view section"));
	const sectionById = new Map(sections.map((s) => [s.id, s]));

	function getCurrentId() {
		const raw = (location.hash || "#home").slice(1);
		return raw || "home";
	}

	function showSection(id) {
		if (!sectionById.has(id)) id = "home";
		sections.forEach((s) => {
			s.style.display = s.id === id ? "block" : "none";
		});
		// Update active nav link
		const links = document.querySelectorAll(".nav .nav-link");
		links.forEach(l => l.classList.remove("active"));
		const target =
			id.startsWith("cs") ? document.querySelector('.nav .nav-link[href="#cs"]') :
			id === "subjects" ? document.querySelector('.nav .nav-link[href="#subjects"]') :
			document.querySelector('.nav .nav-link[href="#home"]');
		target?.classList.add("active");
		// Reset scroll to top for nicer navigation
		try {
			window.scrollTo(0, 0);
		} catch {}
	}


	window.addEventListener("hashchange", () => showSection(getCurrentId()));
	// Default to home if no hash
	if (!location.hash) location.hash = "#home";
	showSection(getCurrentId());

	// Quiz logic for CS Variables
	const quizForm = document.getElementById("quiz-form");
	if (quizForm) {
		const checkBtn = quizForm.querySelector('button[type="button"]');
		if (checkBtn) {
			checkBtn.disabled = false;
			checkBtn.title = "";
		}

		// Create a result line appended at end of form
		let resultEl = document.getElementById("quiz-result");
		if (!resultEl) {
			resultEl = document.createElement("p");
			resultEl.id = "quiz-result";
			resultEl.className = "muted";
			quizForm.appendChild(resultEl);
		}

		checkBtn?.addEventListener("click", () => {
			const items = Array.from(quizForm.querySelectorAll(".quiz-item"));
			let correct = 0;
			const total = items.length;

			items.forEach((item, idx) => {
				// Determine the correct answer from data-answer
				const correctVal = item.querySelector(".answer")?.dataset?.answer;
				// Find the radio group name (assumes all radios within the item share the same name)
				const anyRadio = item.querySelector('input[type="radio"]');
				const groupName = anyRadio?.getAttribute("name") || `q${idx + 1}`;
				const selected = quizForm.querySelector(`input[name="${groupName}"]:checked`)?.value;

				item.classList.remove("correct", "incorrect");
				if (selected && correctVal && selected === correctVal) {
					correct++;
					item.classList.add("correct");
				} else {
					item.classList.add("incorrect");
				}
			});

			resultEl.textContent = `You scored ${correct}/${total}.`;
			try {
				localStorage.setItem(
					"quiz:cs:variables",
					JSON.stringify({ correct, total, time: Date.now() })
				);
			} catch {}
		});
	}

	// Remote code runner (Python via Pyodide) in project section
	const termOutput = document.getElementById("terminal-output");
	const fetchBtn = document.getElementById("fetch-run");
	const urlInput = document.getElementById("fetch-url");
	const manualRunBtn = document.getElementById("manual-run");
	const manualTextarea = document.getElementById("manual-code");

	if (termOutput && fetchBtn && urlInput && manualRunBtn && manualTextarea) {
		let pyodidePromise = null;
		function loadScript(src) {
			return new Promise((resolve, reject) => {
				const s = document.createElement("script");
				s.src = src;
				s.onload = resolve;
				s.onerror = () => reject(new Error("Failed to load " + src));
				document.head.appendChild(s);
			});
		}

		async function ensurePyodide() {
			if (!window.loadPyodide) {
				await loadScript("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");
			}
			if (!pyodidePromise) {
				pyodidePromise = window.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/" });
			}
			return pyodidePromise;
		}

		async function runPythonSafely(code) {
			const pyodide = await ensurePyodide();
			const py = `import sys, io, json\n_stdout, _stderr = sys.stdout, sys.stderr\n_outbuf, _errbuf = io.StringIO(), io.StringIO()\nsys.stdout, sys.stderr = _outbuf, _errbuf\n_exc = None\ntry:\n    exec(compile(${JSON.stringify(code)}, '<user>', 'exec'), {})\nexcept Exception as e:\n    _exc = str(e)\nfinally:\n    sys.stdout, sys.stderr = _stdout, _stderr\nres = {"out": _outbuf.getvalue(), "err": _errbuf.getvalue(), "exc": _exc}\njson.dumps(res)`;
			try {
				const jsonStr = pyodide.runPython(py);
				return JSON.parse(jsonStr);
			} catch (e) {
				return { out: "", err: "", exc: String(e && e.message ? e.message : e) };
			}
		}

		function append(lines, cls) {
			lines.forEach(line => {
				const div = document.createElement("div");
				if (cls) div.className = cls;
				div.textContent = line;
				termOutput.appendChild(div);
			});
		}

		fetchBtn.addEventListener("click", async () => {
			termOutput.innerHTML = "";
			const url = urlInput.value.trim();
			if (!url) return;
			append(["Fetching " + url + "..."], "muted");
			try {
				const res = await fetch(url);
				if (!res.ok) throw new Error(res.status + " " + res.statusText);
				const html = await res.text();
				const doc = new DOMParser().parseFromString(html, "text/html");
				const blocks = [...doc.querySelectorAll("pre code")].map(el => el.textContent.trim()).filter(Boolean);
				if (!blocks.length) { append(["No code blocks found"], "warn"); return; }
				blocks.forEach((code, i) => {
					append(["--- Block " + (i + 1) + " ---"], "sep");
					runPythonSafely(code).then(({ out, err, exc }) => {
						if (out) append(out.split(/\n/).filter(Boolean), "out");
						if (err) append(err.split(/\n/).filter(Boolean), "error");
						if (exc) append(["Error: " + exc], "error");
						if (!out && !err && !exc) append(["[no output]"], "muted");
					});
				});
			} catch (e) {
				append(["Fetch failed: " + e.message], "error");
				append(["If CORS blocks, paste Python below and use Run"], "muted");
			}
		});

		manualRunBtn.addEventListener("click", async () => {
			termOutput.innerHTML = "";
			const code = manualTextarea.value;
			if (!code.trim()) return;
			const { out, err, exc } = await runPythonSafely(code);
			if (out) append(out.split(/\n/).filter(Boolean), "out");
			if (err) append(err.split(/\n/).filter(Boolean), "error");
			if (exc) append(["Error: " + exc], "error");
			if (!out && !err && !exc) append(["[no output]"], "muted");
		});
	}
});
