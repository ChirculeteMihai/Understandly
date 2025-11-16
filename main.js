// Understandly minimal app logic: hash routing + quiz scoring
document.addEventListener("DOMContentLoaded", () => {
	// Safety: ensure external target=_blank links cannot control opener
	Array.from(document.querySelectorAll('a[target="_blank"]'))
		.forEach(a => a.setAttribute('rel', 'noopener noreferrer'));
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
		} catch {
	}

    function clearanswers(form) {
        const items = Array.from(form.querySelectorAll(".quiz-item"));
        items.forEach((item) => {
            item.classList.remove("correct", "incorrect");
            const radios = item.querySelectorAll('input[type="radio"]');
            radios.forEach((radio) => {
                radio.checked = false;
            });
        });
        resultEl.textContent = "";
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
            clearanswers(quizForm);
			try {
				localStorage.setItem(
					"quiz:cs:variables",
					JSON.stringify({ correct, total, time: Date.now() })
				);
			} catch {}
		});
	}

	// Remote code runner (Python via Web Worker) on project section
	const termOutput = document.getElementById("terminal-output");
	const manualRunBtn = document.getElementById("manual-run");
	const manualTextarea = document.getElementById("manual-code");

	if (termOutput && manualRunBtn && manualTextarea) {
		function append(lines, cls) {
			lines.forEach(line => {
				const div = document.createElement("div");
				if (cls) div.className = cls;
				div.textContent = line;
				termOutput.appendChild(div);
			});
		}

		function runInWorker(code, { timeoutMs = 4000 } = {}) {
			return new Promise((resolve) => {
				const worker = new Worker("py-worker.js");
				const id = Math.random().toString(36).slice(2);
				let done = false;
				const timer = setTimeout(() => {
					if (done) return;
					done = true;
					try { worker.terminate(); } catch {}
					resolve({ out: "", err: "", exc: "Timed out" });
				}, timeoutMs);
				worker.onmessage = (e) => {
					if (done) return;
					done = true;
					clearTimeout(timer);
					try { worker.terminate(); } catch {}
					const { out = "", err = "", exc = "" } = e.data || {};
					resolve({ out, err, exc });
				};
				worker.postMessage({ id, code });
			});
		}

		manualRunBtn.addEventListener("click", async () => {
			termOutput.innerHTML = "";
			const code = manualTextarea.value;
			if (!code.trim()) return;
			manualRunBtn.disabled = true;
			append(["Running..."], "muted");
			const { out, err, exc } = await runInWorker(code, { timeoutMs: 3000 });
			termOutput.innerHTML = "";
			if (out) append(out.split(/\n/).filter(Boolean), "out");
			if (err) append(err.split(/\n/).filter(Boolean), "error");
			if (exc) append(["Error: " + exc], "error");
			if (!out && !err && !exc) append(["[no output]"], "muted");
			manualRunBtn.disabled = false;
		});
	}
}
});
