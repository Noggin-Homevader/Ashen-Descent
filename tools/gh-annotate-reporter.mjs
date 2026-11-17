// Node test reporter for GitHub Actions: prints each failing test as an error annotation, so failures show up on
// the pull request and through the checks API without opening the job log.
export default async function* reporter(source) {
  for await (const ev of source) {
    if (ev.type !== 'test:fail' || ev.data.details?.type === 'suite') continue;
    const err = ev.data.details?.error;
    const cause = err?.cause ?? err;
    const msg = `${ev.data.name}: ${cause?.message ?? err?.message ?? 'failed'}`.replace(/%/g, '%25').replace(/\r?\n/g, '%0A').slice(0, 3000);
    const file = ev.data.file ? ev.data.file.replace(/^.*?launcher[\\/]/, 'launcher/').replace(/\\/g, '/') : '';
    yield `::error ${file ? `file=${file},line=${ev.data.line || 1},` : ''}title=Test failed::${msg}\n`;
  }
}
