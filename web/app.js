const form = document.getElementById('recovery-form');
const output = document.getElementById('output');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form);

  const payload = {
    input: data.get('input'),
    output: data.get('output'),
    types: data.get('types'),
    min_size_kb: data.get('min_size_kb'),
    max_files: data.get('max_files'),
    chunk_size_mb: data.get('chunk_size_mb'),
    aggressive_level: data.get('aggressive_level'),
    report_prefix: data.get('report_prefix'),
    dry_run: data.get('dry_run') === 'on',
    verbose: data.get('verbose') === 'on',
    no_dedupe: data.get('no_dedupe') === 'on',
  };

  output.textContent = 'Running...';

  try {
    const response = await fetch('/api/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    output.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    output.textContent = `Request failed: ${error}`;
  }
});
