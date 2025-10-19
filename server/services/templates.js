const DEFAULT_TEMPLATE = `<li class="<?= htmlspecialchars($item['className'] ?? '') ?>">
  <a href="<?= htmlspecialchars($item['uri'] ?? '#') ?>">
    <?= htmlspecialchars($item['text'] ?? '') ?>
  </a>
  <?php if (!empty($item['children'])): ?>
    <ul>
      <?= renderMenu($item['children']); ?>
    </ul>
  <?php endif; ?>
</li>`;

function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const value = typeof raw.value === 'string' ? raw.value.trimEnd() : '';
  if (!name) return null;
  const slot = {
    name,
    value: value || (name === 'default' ? DEFAULT_TEMPLATE : ''),
  };
  return slot;
}

export function validateTemplates(list) {
  if (!Array.isArray(list)) {
    return { ok: false, errors: ['Список шаблонов должен быть массивом'] };
  }

  const normalized = [];
  const errors = [];
  const seen = new Set();

  list.forEach((tpl, index) => {
    const entry = normalizeEntry(tpl);
    if (!entry) {
      errors.push(`Шаблон с индексом ${index} содержит ошибки`);
      return;
    }
    if (seen.has(entry.name)) {
      errors.push(`Шаблон с именем "${entry.name}" уже существует`);
      return;
    }
    if (!entry.value) {
      errors.push(`Шаблон "${entry.name}" имеет пустое содержимое`);
      return;
    }
    seen.add(entry.name);
    normalized.push(entry);
  });

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true, normalized: ensureDefault(normalized) };
}

export function ensureDefault(list = []) {
  let hasDefault = false;
  const prepared = list.map((tpl) => {
    if (tpl.name !== 'default') return tpl;
    hasDefault = true;
    const value = tpl.value && tpl.value.trim() ? tpl.value : DEFAULT_TEMPLATE;
    return { name: 'default', value };
  });
  if (hasDefault) {
    return prepared;
  }
  return [{ name: 'default', value: DEFAULT_TEMPLATE }, ...prepared];
}

export function templatesEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].name !== b[i].name) return false;
    if ((a[i].value || '') !== (b[i].value || '')) return false;
  }
  return true;
}

export { DEFAULT_TEMPLATE };
