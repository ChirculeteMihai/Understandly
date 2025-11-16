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

	// Remote code runner (JS) in terminal section
	const termOutput = document.getElementById("terminal-output");
	const fetchBtn = document.getElementById("fetch-run");
	const urlInput = document.getElementById("fetch-url");
	const manualRunBtn = document.getElementById("manual-run");
	const manualTextarea = document.getElementById("manual-code");

	if (termOutput && fetchBtn && urlInput && manualRunBtn && manualTextarea) {
		const iframe = document.createElement("iframe");
		iframe.style.display = "none";
		iframe.setAttribute("sandbox", "allow-scripts");
		iframe.srcdoc = "<!doctype html><html><head></head><body></body></html>";
		document.body.appendChild(iframe);

		function evalInSandbox(code) {
			const win = iframe.contentWindow;
			const captured = [];
			const originalLog = win.console.log;
			win.console.log = (...args) => captured.push(args.join(" "));
			try { win.eval(code); } catch (e) { captured.push("Error: " + e.message); }
			win.console.log = originalLog;
			return captured;
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
					const out = evalInSandbox(code);
					append(out.length ? out : ["[no output]"], "out");
				});
			} catch (e) {
				append(["Fetch failed: " + e.message], "error");
				append(["If CORS blocks, paste code below and use Run"], "muted");
			}
		});

		manualRunBtn.addEventListener("click", () => {
			termOutput.innerHTML = "";
			const code = manualTextarea.value;
			if (!code.trim()) return;
			const out = evalInSandbox(code);
			append(out.length ? out : ["[no output]"], "out");
		});
	}
});
