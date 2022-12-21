import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import layout from './lib/layout.js';

const PORT = 3000;
(async (app) => {
  const [tags, histories] = await readTags();
  console.log('tags:', tags.length);
  console.log('history:', histories.length);

  app.use(layout);

  app.set('view engine', 'jade');
  app.set('views', path.join(path.resolve(), 'views'));
  app.set('layout', '_layout');

  app.use(express.json());

  app.post('/answer', (req, res) => {
    const id = req.body?.id ?? '';
    const ids = req.body?.services ?? [];
    const isTask = (req.body?.type ?? '') === 'task';

    if (!id || !ids) return res.send();

    const tag = isTask ? tags.shift() : histories.find((e) => e.id === id);
    if (!id) return res.send();

    const file = path.join(path.resolve(), 'data/answers.txt');
    fs.appendFileSync(file, tag.id + '\t' + ids.join(',') + '\n');

    isTask && histories.push(tag);
    tag.answers = ids;

    res.send(JSON.stringify({ old: tag, new: tags[0] }));
  });

  app.get('/tag', (_, res) => res.send(JSON.stringify({ tag: tags[0] })));

  app.get('/histories', (_, res) => res.send(JSON.stringify(histories)));

  app.get('/', async (_, res) => {
    const output = [];
    const services = await readServices();
    services.forEach((service) => {
      const names = service.name.split('-');
      service.name = names[names.length - 1];

      const target = output.find((e) => e.title === names[0]);
      if (target) {
        target.groups.find((e) => e.title === names[1])?.items.push(service) ??
          target.groups.push({
            title: names[1],
            items: [service],
          });
      } else {
        output.push({
          title: names[0],
          groups: [
            {
              title: names[1],
              items: [service],
            },
          ],
        });
      }
    });

    res.render('index', { services: output });
  });

  app.use((_, res) => res.type('txt').send('Not found'));

  app.listen(PORT, () => {
    console.log(`App listening at http://localhost:${PORT}`);
  });
})(express());

/**
 * @returns {Promise<{name: string, title: string, description: string}[]>}
 */
async function readServices() {
  const servicesFile = path.join(path.resolve(), 'data/services.json');
  return new Promise((res, rej) => {
    fs.readFile(servicesFile, (err, data) => {
      err ? rej(err) : res(JSON.parse(data));
    });
  });
}

async function readTags() {
  const tagFile = path.join(path.resolve(), 'data/tags.tsv');
  const ansFile = path.join(path.resolve(), 'data/answers.txt');
  const tagLines = fs.readFileSync(tagFile).toString().split('\n');
  const answersLines = fs.readFileSync(ansFile).toString().split('\n');

  const histories = {};
  let i = 0;
  answersLines.forEach((line) => {
    const [id, answer] = line.split('\t');
    if (id && answer !== undefined) {
      histories[id] = {
        index: i++,
        answers: answer.split(',').filter(Boolean),
      };
    }
  });

  const tags = {};
  // always ignore first line
  for (const line of tagLines.slice(1)) {
    const [id, name, taxonomy_id, taxonomy_name] = line.split('\t');
    if (!name) continue;

    const tag = { id, name, taxonomy_id, taxonomy_name };
    if (histories[id]) {
      if (!histories[id].id) {
        histories[id] = { ...histories[id], ...tag };
      }
    } else if (!tags[id]) {
      tags[id] = tag;
    }
  }

  return [
    Object.values(tags),
    Object.values(histories).sort((a, b) => a.index - b.index),
  ];
}
