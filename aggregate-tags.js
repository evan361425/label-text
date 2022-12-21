import fs from 'node:fs';

const output = 'data/sanitized.txt';
const tagsLines = fs.readFileSync('data/tags.tsv').toString().split('\n');
const answerLines = fs.readFileSync('data/answers.txt').toString().split('\n');
fs.writeFileSync(output, '');

const tags = {};
const tagNameIdPairs = {};
const parents = {};
for (const line of tagsLines.slice(1)) {
  if (!line) continue;
  let [id, name] = line.split('\t');
  if (!id || !name || tags[id]) continue;

  if (name.startsWith('人資市集──')) {
    name = name.substring(6);
  }

  // 如果名稱一樣，記錄在 `parents`
  if (tagNameIdPairs[name]) {
    parents[id] = tagNameIdPairs[name];
    continue;
  }

  tagNameIdPairs[name] = id;
  tags[id] = { id, name };
}

const answers = {};
for (const line of answerLines) {
  const [id, answer] = line.split('\t');

  if (tags[id]) {
    answers[id] = { ...tags[id], answer, others: [] };
  } else if (tags[parents[id] ?? '']) {
    const parentId = parents[id];
    if (!answers[parentId]) {
      answers[parentId] = { ...tags[parentId], answer, others: [] };
    } else {
      answers[parentId].others.push(answer);
    }
  }
}

for (const tag of Object.values(answers)) {
  const others = [tag.answer, ...tag.others].map((e) => e.split(',')).flat();
  const final = [...new Set(others)].join(',');
  const v = [tag.id, tag.name, final].join('\t');
  fs.appendFileSync(output, v + '\n');
}
