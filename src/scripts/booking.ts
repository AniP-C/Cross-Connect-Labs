// "Hop on a call": any [data-book] button opens the booking dialog in ContactDialog.astro.
// Free times come from the Worker (/api/slots in worker/index.ts) and are shown in the
// visitor's own time zone. Where there is no Worker or it isn't set up (dev server, Docker,
// no Google secrets yet), the dialog offers WhatsApp and email instead.

const dialog = document.querySelector<HTMLDialogElement>('[data-book-dialog]');

if (dialog) {
  const get = <T extends HTMLElement = HTMLElement>(sel: string) => dialog.querySelector<T>(sel)!;
  const status = get('[data-book-status]');
  const picker = get('[data-book-picker]');
  const fallback = get('[data-book-fallback]');
  const fallbackText = get('[data-book-fallback-text]');
  const done = get('[data-book-done]');
  const doneText = get('[data-book-done-text]');
  const days = get('[data-book-days]');
  const times = get('[data-book-times]');
  const form = get<HTMLFormElement>('[data-book-form]');
  const note = get('[data-book-note]');
  const send = get<HTMLButtonElement>('[data-book-send]');
  const nameInput = form.elements.namedItem('name') as HTMLInputElement;
  const emailInput = form.elements.namedItem('email') as HTMLInputElement;
  const noteInput = form.elements.namedItem('note') as HTMLTextAreaElement;
  const defaultFallback = fallbackText.textContent ?? '';

  const zone = new Intl.DateTimeFormat(undefined, { timeZoneName: 'long' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName');
  get('[data-book-zone]').textContent = zone ? `(${zone.value})` : '';
  const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  const fullFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' });

  let byDay = new Map<string, Date[]>();
  let chosen: Date | undefined;

  const show = (part: HTMLElement) => {
    for (const el of [status, picker, fallback, done]) el.hidden = el !== part;
  };

  const say = (text: string, error = false) => {
    note.textContent = text;
    note.classList.toggle('error', error);
  };

  const pick = (label: string, pressed: boolean, onClick: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(pressed));
    b.addEventListener('click', onClick);
    return b;
  };

  const press = (group: HTMLElement, button: HTMLElement) =>
    group.querySelectorAll('.pick').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));

  function selectDay(key: string) {
    chosen = undefined;
    say('Pick a time first.');
    times.replaceChildren(
      ...(byDay.get(key) ?? []).map((slot) => {
        const b = pick(timeFormat.format(slot), false, () => {
          chosen = slot;
          press(times, b);
          say(`${fullFormat.format(slot)}. Add your name and email.`);
        });
        return b;
      }),
    );
  }

  async function load() {
    show(status);
    status.textContent = 'checking the line…';
    try {
      const res = await fetch('/api/slots', { headers: { Accept: 'application/json' } });
      if (!res.ok || !res.headers.get('Content-Type')?.includes('application/json')) throw new Error(String(res.status));
      const data = (await res.json()) as { slots: string[] };
      byDay = new Map();
      for (const iso of data.slots) {
        const slot = new Date(iso);
        const key = dayFormat.format(slot);
        byDay.set(key, [...(byDay.get(key) ?? []), slot]);
      }
      if (!byDay.size) {
        fallbackText.textContent = 'Every slot in the next two weeks is taken. Message us and we’ll find a time.';
        show(fallback);
        return;
      }
      const keys = [...byDay.keys()];
      days.replaceChildren(
        ...keys.map((key, i) => {
          const b = pick(key, i === 0, () => {
            press(days, b);
            selectDay(key);
          });
          return b;
        }),
      );
      selectDay(keys[0]);
      show(picker);
    } catch {
      fallbackText.textContent = defaultFallback;
      show(fallback);
    }
  }

  function open() {
    if (!dialog!.open) dialog!.showModal();
    load();
  }

  document.addEventListener('click', (event) => {
    if (!(event.target as Element | null)?.closest('[data-book]')) return;
    event.preventDefault();
    open();
  });

  dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    nameInput.setAttribute('aria-invalid', String(!name));
    emailInput.setAttribute('aria-invalid', String(!emailOk));
    if (!chosen) return say('Pick a time first.', true);
    if (!name || !emailOk) {
      (name ? emailInput : nameInput).focus();
      return say('Add your name and an email for the invite.', true);
    }

    send.disabled = true;
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          start: chosen.toISOString(),
          name,
          email,
          note: noteInput.value.trim(),
          botcheck: (form.elements.namedItem('botcheck') as HTMLInputElement).checked,
        }),
      });
      if (res.status === 409) {
        await load();
        return say('Someone just took that time. Pick another one.', true);
      }
      if (!res.ok) throw new Error(String(res.status));
      doneText.textContent = `See you ${fullFormat.format(chosen)}. The invite with the Google Meet link is on its way to ${email}.`;
      form.reset();
      show(done);
    } catch {
      say('That did not go through. Please try again, or message us on WhatsApp.', true);
    } finally {
      send.disabled = false;
    }
  });
}
