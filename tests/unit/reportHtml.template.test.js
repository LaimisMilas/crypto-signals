import { htmlPage } from '../../src/services/reportHtml.js';

test('htmlPage contains Chart, Stats table and escapes title/params', () => {
  const html = htmlPage({
    title: '<script>x</script>',
    dataJson: JSON.stringify({ jobIds:[1], items:[], params:{ baseline:'live', align:'none', rebase:null } }),
    generatedAt: 0, params: { baseline: 'live', align:'none', rebase:null }
  });
  expect(html).toContain('Chart.js');
  expect(html).toContain('<table id="stats">');
  expect(html).not.toContain('<script>x</script>');
});
