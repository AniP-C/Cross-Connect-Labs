// Any part of the page can open the contact dialog, optionally pre-filled.
export interface ContactPrefill {
  topic?: string;
  budget?: string;
  message?: string;
}

export const CONTACT_EVENT = 'cc:contact';

export function openContact(detail: ContactPrefill = {}) {
  window.dispatchEvent(new CustomEvent<ContactPrefill>(CONTACT_EVENT, { detail }));
}

// Buttons with data-contact open the dialog; data-topic / data-budget / data-message pre-fill it.
export function bindContactButtons(root: ParentNode = document) {
  root.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    const button = target?.closest<HTMLElement>('[data-contact]');
    if (!button) return;
    event.preventDefault();
    openContact({
      topic: button.dataset.topic,
      budget: button.dataset.budget,
      message: button.dataset.message,
    });
  });
}
