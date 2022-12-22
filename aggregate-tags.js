import fs from 'node:fs';

const output = 'data/sanitized.txt';
const tagsLines = fs.readFileSync('data/tags.tsv').toString().split('\n');
const answerLines = fs.readFileSync('data/answers.txt').toString().split('\n');
fs.writeFileSync(output, '');

const tags = {};
const tagNameIdPairs = {};
const relationships = {};
for (const line of tagsLines.slice(1)) {
  if (!line) continue;
  let [id, name] = line.split('\t');
  if (!id || !name || tags[id]) continue;

  if (name.includes('──')) {
    name = name.split('──')[1];
  }

  // 如果名稱一樣，記錄在 `relationships`
  if (tagNameIdPairs[name]) {
    relationships[id] = tagNameIdPairs[name];
    continue;
  }

  tagNameIdPairs[name] = id;
  tags[id] = { id, name };
}

const answers = {};
for (const line of answerLines) {
  const [id, answer] = line.split('\t');
  if (!id) continue;

  const exist = !!tags[id];
  let usedId = id;
  if (!exist) {
    if (relationships[id] && tags[relationships[id]]) {
      usedId = relationships[id];
    } else {
      console.log(`WARN! not found ${id} tag with ${answer}`);
      continue;
    }
  }

  if (!answers[usedId]) {
    answers[usedId] = {
      ...tags[usedId],
      answer,
      others: [],
      children: exist ? [] : [id],
    };
  } else {
    answers[usedId].others.push(answer);
    exist || answers[usedId].children.push(id);
  }
}

for (const tag of Object.values(answers)) {
  const others = [tag.answer, ...tag.others].map((e) => e.split(',')).flat();
  const final = [...new Set(others)].join(',');
  const v = [
    tag.id,
    tag.name.replace(/ /g, ''),
    final,
    tag.children.join(','),
  ].join('\t');
  fs.appendFileSync(output, v + '\n');
}
