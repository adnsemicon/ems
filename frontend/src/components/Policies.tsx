import React from 'react';
import careerProgressionPolicy from '../../../policies/career_progression_policy.md?raw';
import leavePolicy from '../../../policies/leave_policy.md?raw';

function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : <React.Fragment key={index}>{part}</React.Fragment>
  );
}

function renderPolicy(markdown: string): React.ReactNode[] {
  const lines = markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '')
    .split(/\r?\n/);
  const content: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line || line === '---') {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const Heading = `h${Math.min(heading[1].length + 1, 6)}` as keyof JSX.IntrinsicElements;
      content.push(
        <Heading key={index} className="mt-5 first:mt-0 text-base font-bold text-slate-900">
          {renderInline(heading[2])}
        </Heading>
      );
      index += 1;
      continue;
    }

    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        const cells = lines[index].trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
        if (!cells.every(cell => /^:?-{3,}:?$/.test(cell))) rows.push(cells);
        index += 1;
      }
      content.push(
        <div key={`table-${index}`} className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            {rows[0] && (
              <thead className="bg-slate-50">
                <tr>{rows[0].map((cell, cellIndex) => (
                  <th key={cellIndex} className="px-3 py-2 font-semibold text-slate-700">{renderInline(cell)}</th>
                ))}</tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex}>{row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2 align-top text-slate-600">{renderInline(cell)}</td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('- ')) {
        items.push(lines[index].trim().slice(2));
        index += 1;
      }
      content.push(
        <ul key={`list-${index}`} className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
          {items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}
        </ul>
      );
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6})\s+/.test(lines[index].trim()) &&
      !lines[index].trim().startsWith('- ') &&
      !lines[index].trim().startsWith('|') &&
      lines[index].trim() !== '---'
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    content.push(
      <p key={`paragraph-${index}`} className="mt-2 text-sm leading-6 text-slate-600">
        {renderInline(paragraph.join(' '))}
      </p>
    );
  }

  return content;
}

export const Policies: React.FC = () => (
  <section className="mx-auto max-w-5xl space-y-6" aria-labelledby="policies-heading">
    <div>
      <h1 id="policies-heading" className="text-2xl font-bold tracking-tight text-slate-900">Company Policies</h1>
      <p className="mt-1 text-sm text-slate-500">Review each policy individually. These documents are available to all employees.</p>
    </div>

    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-bold text-slate-900">Career Progression Policy</h2>
      <div className="mt-4">{renderPolicy(careerProgressionPolicy)}</div>
    </article>

    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-bold text-slate-900">Engineering Leave Policy</h2>
      <div className="mt-4">{renderPolicy(leavePolicy)}</div>
    </article>
  </section>
);
