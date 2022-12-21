$(function () {
  let histories;
  let currentType = 'task';
  let historyIndex;
  const loading =
    '<div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>';
  const selected = { task: {}, history: {} };
  const toast = new bootstrap.Toast($('#toast'), { autohide: false });
  const stdout = new bootstrap.Toast($('#stdout'), { delay: 3000 });

  // get tag now!
  $.get('/tag', (res) => drawTag(res.tag), 'json');

  $('form').submit(function (ev) {
    ev.preventDefault();

    const isTask = currentType === 'task';
    const $el = $('#' + (isTask ? 'tag' : 'history'));
    const id = $el.data('id');
    const services = Object.values(selected[currentType]).map((el) => el.value);

    $el.html(loading);

    $.post({
      url: '/answer',
      data: JSON.stringify({ id, services, type: currentType }),
      dataType: 'json',
      contentType: 'application/json',
      success: (res) => {
        if (!res.old) return;

        if (isTask) {
          drawTag(res.new);
          historyIndex = histories.length;
          histories.push(res.old);
        } else {
          histories[historyIndex] = res.old;
          drawHistory(historyIndex);
        }
        stdout.show();
      },
    });

    return false;
  });

  $('#toast-hide').click(function () {
    toast.hide();
  });

  $('#history-tab').one('show.bs.tab', function () {
    $.get(
      '/histories',
      (res) => {
        histories = res;
        if (!histories.length) return;
        historyIndex = histories.length - 1;
        drawHistory(historyIndex);
      },
      'json'
    );
  });

  // change type every time it shows
  $('#task-tab').on('show.bs.tab', () => {
    currentType = 'task';
    renderSelected();
  });
  $('#history-tab').on('show.bs.tab', () => {
    currentType = 'history';
    renderSelected();
  });

  $('[data-bs-toggle="popover"]').popover();
  $('input[type="checkbox"]').change(function () {
    if (this.checked) {
      selected[currentType][this.id] = this;
    } else {
      delete selected[currentType][this.id];
    }
    renderSelected();
  });

  $('#history-prev').click(function () {
    historyIndex > 0 && drawHistory(--historyIndex);
  });
  $('#history-next').click(function () {
    historyIndex < histories.length && drawHistory(++historyIndex);
  });

  function drawTag(tag) {
    if (!tag) {
      $('#tag').html('').data('id', '');
    } else {
      $('#tag')
        .html(
          `<h3>${tag.name}</h3>` +
            createBadge(tag.id) +
            createBadge(tag.taxonomy_name)
        )
        .data('id', tag.id);
    }
    resetSelected();
    renderSelected();
  }

  function drawHistory(idx) {
    resetSelected();

    if (idx === 0) {
      $('#history-prev').prop('disabled', true);
    } else if (idx === histories.length - 1) {
      $('#history-next').prop('disabled', true);
    } else {
      $('#history-prev').prop('disabled', false);
      $('#history-next').prop('disabled', false);
    }
    $('#history-page').text(`(${idx + 1}/${histories.length})`);

    const tag = histories[idx];
    for (const answer of tag.answers) {
      const checkbox = $(`#history-${answer}`);
      if (checkbox.length) {
        checkbox.prop('checked', true);
        selected['history'][checkbox[0].id] = checkbox[0];
      }
    }

    $('#history')
      .html(
        `<h3>${tag.name}</h3>` +
          createBadge(tag.id) +
          createBadge(tag.taxonomy_name)
      )
      .data('id', tag.id);

    renderSelected();
  }

  function renderSelected() {
    const els = Object.values(selected[currentType]);
    if (!els.length) {
      toast.hide();
      return;
    }

    const items = els
      .map((el) => {
        return (
          `<li class="list-group-item d-flex" data-id="${el.id}">` +
          $(el).data('name') +
          '<button type="button" class="btn-close me-2 m-auto" aria-label="Close">' +
          '</li>'
        );
      })
      .join('');

    $('#toast-body')
      .html(`<ul class="list-group">${items}</ul>`)
      .on('click', 'button', function () {
        const id = $(this).parent().data('id');
        $(`#${id}`).prop('checked', false);
        delete selected[currentType][id];
        renderSelected();
      });
    toast.isShown() || toast.show();
  }

  function resetSelected() {
    for (const id of Object.keys(selected[currentType])) {
      $(`#${id}`).prop('checked', false);
    }
    selected[currentType] = {};
  }
});

function createBadge(text) {
  return `<div class="align-self-center badge rounded-pill bg-secondary me-2">${text}</div>`;
}
