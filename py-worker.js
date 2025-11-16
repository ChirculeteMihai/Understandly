/* Pyodide Worker: runs Python code off the main thread to avoid UI freezes.
 * Loads Pyodide from jsDelivr and executes user code with stdout/stderr capture.
 */

self.importScripts('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');
let pyodideReadyPromise = self.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' });

self.onmessage = async (e) => {
  const { id, code } = e.data || {};
  const pyodide = await pyodideReadyPromise;
  const py = `import sys, io, json\n_stdout, _stderr = sys.stdout, sys.stderr\n_outbuf, _errbuf = io.StringIO(), io.StringIO()\nsys.stdout, sys.stderr = _outbuf, _errbuf\n_exc = None\ntry:\n    exec(compile(${JSON.stringify(code || '')}, '<user>', 'exec'), {})\nexcept Exception as e:\n    _exc = str(e)\nfinally:\n    sys.stdout, sys.stderr = _stdout, _stderr\nres = {"out": _outbuf.getvalue(), "err": _errbuf.getvalue(), "exc": _exc}\njson.dumps(res)`;
  try {
    const jsonStr = pyodide.runPython(py);
    const res = JSON.parse(jsonStr);
    self.postMessage({ id, ok: true, ...res });
  } catch (err) {
    self.postMessage({ id, ok: false, out: '', err: '', exc: String(err && err.message ? err.message : err) });
  }
};
