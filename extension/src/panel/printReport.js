export function printReport(reportWindow, markdown) {
  const page = reportWindow.document;
  page.title = 'BRINSPECTOR Incident Report';
  const style = page.createElement('style');
  style.textContent = '@page { margin: 18mm; } body { color: #171717; font: 14px/1.55 sans-serif; } main { max-width: 800px; margin: auto; } pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; }';
  page.head.appendChild(style);
  const main = page.createElement('main');
  const content = page.createElement('pre');
  content.textContent = markdown;
  main.appendChild(content);
  page.body.replaceChildren(main);
  reportWindow.focus();
  reportWindow.print();
}