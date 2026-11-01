// All editable site content lives here. Replace every [bracketed] value before launch.

export const site = {
  name: 'Cross-Connect Labs',
  location: '[City, Country]',
  languages: '[English, …]',
  replyTime: '[24 hours]',
  // Shown as a badge in the hero. Set to '' to hide it.
  availability: 'booking projects for december',
  title: 'Cross-Connect Labs · Websites, apps, WhatsApp bots and automation',
  // About 155 characters, so search results show all of it.
  description:
    'Websites, mobile apps, online stores, WhatsApp bots, clinic CRMs, AI automation and PLC/SCADA work from a small studio of engineers. No minimum budget.',
  // Describes public/og-image.png for screen readers when the link is shared.
  imageAlt: 'Cross-Connect Labs: Plug in your problem. We’ll wire the fix. No minimum budget.',
};

export const contact = {
  // Digits only, with country code, e.g. '919876543210'. Used for wa.me links.
  whatsapp: '917900842047',
  whatsappDisplay: '+91 79008 42047',
  // Typed into WhatsApp for the visitor when they tap the number.
  whatsappMessage: 'Hi Cross-Connect Labs, I have an idea I’d like to talk about.',
  // Typed into WhatsApp when online booking isn't set up and the visitor asks for a call.
  callMessage: 'Hi Cross-Connect Labs, I’m not sure yet what I need. Can we hop on a call?',
  email: 'hello@crossconnectlabs.com',
  emailDisplay: 'hello@crossconnectlabs.com',
  emailSubject: 'Project enquiry',
  // Optional form service. Web3Forms: endpoint 'https://api.web3forms.com/submit' plus accessKey.
  // Formspree: endpoint 'https://formspree.io/f/xxxxxxx' and leave accessKey empty.
  formEndpoint: '',
  formAccessKey: '',
};

// "Hop on a call" booking. The Worker (worker/index.ts) reads this too: it offers these slots
// from your Google Calendar and books them with a Meet link. Setup: docs/booking.md.
export const booking = {
  heading: 'No idea what you’re looking for?',
  cta: 'Let’s hop on a call',
  timeZone: 'Asia/Kolkata',
  // 0 = Sunday … 6 = Saturday.
  days: [1, 2, 3, 4, 5, 6],
  dayStart: '10:00',
  dayEnd: '18:00',
  minutes: 30,
  // How far ahead visitors can book, and the shortest notice you accept.
  daysAhead: 14,
  noticeHours: 3,
  eventTitle: 'Intro call · Cross-Connect Labs',
};

export const nav = [
  { href: '#services', label: 'services' },
  { href: '#work', label: 'work' },
  { href: '#pricing', label: 'pricing' },
  { href: '#faq', label: 'faq' },
];

// Patch bay. JACK_Y are positions in the 640 × 400 panel drawing.
export const JACK_Y = [110, 165, 220, 275, 330];

export const problems = ['Too many calls', 'Orders on paper', 'No website yet', 'Typing invoices', 'Machines unwatched'];

export const builds = [
  { label: 'WhatsApp bot', topic: 'WhatsApp bot', time: '1–3 weeks' },
  { label: 'Online store', topic: 'Online store', time: '3–6 weeks' },
  { label: 'Website', topic: 'Website', time: '1–3 weeks' },
  { label: 'AI automation', topic: 'AI automation', time: '1–3 weeks' },
  { label: 'PLC · SCADA', topic: 'Electrical work', time: 'per project' },
];

export const modules = [
  { code: 'MOD-01 · WEB', name: 'Websites', time: '1–3 wks', topic: 'Website', desc: 'Business sites and landing pages that load fast and are easy to update.' },
  { code: 'MOD-02 · APP', name: 'Web apps & dashboards', time: '3–8 wks', topic: 'Website', desc: 'Customer portals, dashboards and internal tools with logins and roles.' },
  { code: 'MOD-03 · MOB', name: 'Mobile apps', time: '4–10 wks', topic: 'Mobile app', desc: 'Android and iOS from one codebase, with payments and notifications.' },
  { code: 'MOD-04 · SHOP', name: 'Online stores', time: '3–6 wks', topic: 'Online store', desc: 'Payments, stock and an admin panel you run yourself.' },
  { code: 'MOD-05 · WA', name: 'WhatsApp bots', time: '1–3 wks', topic: 'WhatsApp bot', desc: 'Answers, bookings and order updates on WhatsApp, with hand-over to you.' },
  { code: 'MOD-06 · CRM', name: 'Clinic bot & CRM', time: '3–6 wks', topic: 'Clinic bot & CRM', desc: 'Appointments, reminders and patient records. No medical advice, urgent messages go to staff.' },
  { code: 'MOD-07 · AI', name: 'AI automation', time: '1–3 wks', topic: 'AI automation', desc: 'AI that reads emails and documents, fills sheets and drafts replies, with you approving.' },
  { code: 'MOD-08 · PLC', name: 'Electrical automation', time: 'per project', topic: 'Electrical work', desc: 'PLC and SCADA work, energy and solar monitoring, plant data over Modbus.' },
];

// Example projects. Replace with real work, and set `example: false` once they are real.
export const cases = [
  {
    code: 'CF-01', kind: 'chat', example: true,
    title: 'Clinic booking bot and patient CRM', sector: 'Clinic · WhatsApp bot + CRM', stack: 'WhatsApp API · Node.js · PostgreSQL',
    problem: 'Reception spent most mornings on the phone taking bookings.',
    built: 'A WhatsApp bot that offers free slots from the doctor’s calendar, books them and sends reminders, plus a simple patient CRM.',
    result: '[Your measured result]',
  },
  {
    code: 'CF-02', kind: 'store', example: true,
    title: 'Online store with admin panel', sector: 'Clothing brand · E-commerce', stack: 'Next.js · Razorpay · PostgreSQL',
    problem: 'Orders came in as Instagram messages and lived in a spreadsheet.',
    built: 'A store with payments and stock by size, an admin panel the owner runs, and WhatsApp order updates.',
    result: '[Your measured result]',
  },
  {
    code: 'CF-03', kind: 'invoice', example: true,
    title: 'Invoices that file themselves', sector: 'Accounting practice · AI automation', stack: 'n8n · OpenAI · Xero',
    problem: 'Two people typed every supplier invoice by hand.',
    built: 'A flow where AI reads each invoice email, checks the budget and creates the bill after one-click approval.',
    result: '[Your measured result]',
  },
  {
    code: 'CF-04', kind: 'solar', example: true,
    title: 'Solar monitoring with fault alerts', sector: 'Solar sites · Electrical + monitoring', stack: 'Modbus TCP · Node-RED · Grafana',
    problem: 'Inverter faults went unnoticed until the monthly report.',
    built: 'Modbus polling of each inverter, an expected-output check, and alerts with a ticket for the site engineer.',
    result: '[Your measured result]',
  },
];

// Knob positions: angle in degrees and label position inside the 260 × 240 knob box.
export const budgets = [
  { key: 'Tiny', deg: -120, x: 21.7, y: 192.5, title: 'A quick job', note: 'Even the smallest task is welcome.',
    items: ['Fix a bug or a broken form', 'Add a WhatsApp chat button', 'A simple WhatsApp auto-reply'] },
  { key: 'Small', deg: -40, x: 49.6, y: 34.2, title: 'A solid start', note: 'Get online or save a few hours a week.',
    items: ['A one-page website', 'A WhatsApp bot for common questions', 'One AI workflow'] },
  { key: 'Medium', deg: 40, x: 210.4, y: 34.2, title: 'A proper system', note: 'Run more of your business online.',
    items: ['A full business website', 'A WhatsApp booking bot with reminders', 'A simple admin panel'] },
  { key: 'Large', deg: 120, x: 238.3, y: 192.5, title: 'A full product', note: 'Built in stages, with a working version early.',
    items: ['An online store with admin panel', 'A clinic bot with patient CRM', 'A mobile app for Android and iOS'] },
];

export const steps = [
  { title: 'Tell us the idea', text: 'WhatsApp, email or the patch bay above. A few lines is enough.' },
  { title: 'We talk, we look at it', text: 'A free chat or call. We ask anything that is unclear.' },
  { title: 'You get the cost', text: 'One clear price that fits your budget. No hidden costs.' },
  { title: 'It goes live', text: 'Weekly updates, then launch and 30 days of free fixes.' },
];

export const reports = [
  { tag: 'REPORT · WEBSITE', quote: '[A short quote from a website or app client.]', name: '[Client name]', role: '[Role, Company]' },
  { tag: 'REPORT · CLINIC BOT', quote: '[A short quote from a clinic or WhatsApp bot client.]', name: '[Client name]', role: '[Role, Company]' },
  { tag: 'REPORT · AUTOMATION', quote: '[A short quote from an automation or electrical client.]', name: '[Client name]', role: '[Role, Company]' },
];

export const faqs = [
  { q: 'Is there a minimum budget?', a: 'No. Small jobs are welcome. Tell us what you can spend and we will tell you honestly what we can do for it.' },
  { q: 'How do you decide the price?', a: 'We look at what you need, how long it will take and your budget. Then you get one clear price before we start, with no hidden costs.' },
  { q: 'How long does it take?', a: 'Small jobs take a few days. Websites take 1–3 weeks. Apps, online stores and bots usually take 2–10 weeks, depending on features.' },
  { q: 'Can I manage the store or app myself?', a: 'Yes. Online stores and apps come with an admin panel where you change products, orders, prices and content without needing us.' },
  { q: 'Is the clinic bot safe for patient data?', a: 'The bot books appointments, sends reminders and answers common questions. It gives no medical advice and sends urgent messages to your staff. Patient data stays in your accounts. [Add how you handle data protection.]' },
  { q: 'Who owns the work?', a: 'You do. At hand-over you get the code, the logins and a short walkthrough video.' },
  { q: 'Do you do electrical work on site?', a: '[Say where you can work on site.] Most PLC, SCADA and monitoring work can be done remotely once we have access to the system.' },
];

export const topics = ['Website', 'Mobile app', 'Online store', 'WhatsApp bot', 'Clinic bot & CRM', 'AI automation', 'Electrical work', 'Small job / fix', 'Not sure yet'];
export const budgetChoices = ['Not sure', 'Tiny', 'Small', 'Medium', 'Large'];
