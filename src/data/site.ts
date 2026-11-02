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
  // Under the enquiry form, for people who'd rather talk first.
  unsure: 'Still not sure what you need?',
  talk: 'Talk it through on a free call',
  // At the top of the enquiry form, so a call is one tap away from the start.
  quick: 'Rather talk than type?',
  quickCta: 'Patch into a free call',
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

// The scrolling strip under the hero: where the team has worked. Each group gets its own
// label-tape tag when there's more than one; `live: true` lights the LED on that group's cards.
// Clients can come back as a second group, e.g. { tag: 'live for', live: true, items: [...] }.
export const patchedIn = {
  label: 'Our team’s experience includes',
  caption: 'Engineers from TCS, AtkinsRéalis, Salesforce and KPMG, now building stores, apps, WhatsApp bots and automation for businesses of any size.',
  groups: [
    {
      tag: 'worked at',
      live: false,
      items: [
        { name: 'TCS', note: 'Tata Consultancy Services' },
        { name: 'AtkinsRéalis', note: 'engineering' },
        { name: 'Salesforce', note: 'CRM software' },
        { name: 'KPMG', note: 'data engineering' },
      ],
    },
  ],
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
  { label: 'PLC · SCADA', topic: 'PLC & automation', time: 'per project' },
];

export const modules = [
  { code: 'MOD-01 · WEB', name: 'Websites', time: '1–3 wks', topic: 'Website', desc: 'Business sites and landing pages that load fast and are easy to update.' },
  { code: 'MOD-02 · APP', name: 'Web apps & dashboards', time: '3–8 wks', topic: 'Website', desc: 'Customer portals, dashboards and internal tools with logins and roles.' },
  { code: 'MOD-03 · MOB', name: 'Mobile apps', time: '4–10 wks', topic: 'Mobile app', desc: 'Android and iOS from one codebase, with payments and notifications.' },
  { code: 'MOD-04 · SHOP', name: 'Online stores', time: '3–6 wks', topic: 'Online store', desc: 'Payments, stock and an admin panel you run yourself.' },
  { code: 'MOD-05 · WA', name: 'WhatsApp bots', time: '1–3 wks', topic: 'WhatsApp bot', desc: 'Answers, bookings and order updates on WhatsApp, with hand-over to you.' },
  { code: 'MOD-06 · CRM', name: 'Clinic bot & CRM', time: '3–6 wks', topic: 'Clinic bot & CRM', desc: 'Appointments, reminders and patient records. No medical advice, urgent messages go to staff.' },
  { code: 'MOD-07 · AI', name: 'AI automation', time: '1–3 wks', topic: 'AI automation', desc: 'AI that reads emails and documents, fills sheets and drafts replies, with you approving.' },
  { code: 'MOD-08 · PLC', name: 'Electrical automation', time: 'per project', topic: 'PLC & automation', desc: 'PLC and SCADA work, energy and solar monitoring, plant data over Modbus.' },
];

// Case files. `kind` picks the readout screen: a `store` case fills it from `screen`, a `flow` case
// lists its steps (`hot` ones glow copper). `link` adds a visit link under the result.
// Set `example: true` on anything that isn't real work yet.
export const cases = [
  {
    code: 'CF-01', kind: 'store', example: false,
    title: 'Dairy shop online store and Android app', sector: 'Dairy shop, Aligarh · Store + app', stack: 'React · Cloudflare D1 · Razorpay',
    problem: 'Milk, paneer and ghee orders came in by phone and WhatsApp, with no way to pay online or sign up for daily milk.',
    built: 'A store and Android app with Google or OTP sign-in, Cash on Delivery and Razorpay, monthly milk plans and order tracking with push alerts. The owner runs prices, stock, offers and delivery times from an admin panel.',
    result: 'Live at atuldairy.com and taking real payments. Checkout was up in ten days, and the Android app is in closed testing on Google Play.',
    link: { label: 'atuldairy.com', href: 'https://atuldairy.com' },
    screen: {
      tiles: [{ label: 'Orders today', value: '18' }, { label: 'Milk plans', value: '42' }, { label: 'Low stock', value: '2', warn: true }],
      orders: [{ no: '#1042', item: 'Paneer · 500 g', status: 'Paid' }, { no: '#1041', item: 'Milk plan · 30 days', status: 'Active' }],
    },
  },
  {
    code: 'CF-02', kind: 'store', example: false,
    title: 'Storefront for a handwoven fashion label', sector: 'Sarees and suit sets · Online store', stack: 'Next.js · Cloudflare D1 + R2 · Razorpay',
    problem: 'A label selling handloom sarees and suit sets needed a shop as careful as the cloth, one the owner could run without a developer.',
    built: 'A storefront with collections, occasions, sizes and colours, Google or email sign-in, Cash on Delivery, Razorpay and coupons. The owner’s panel covers orders and couriers, stock by size, sales, page drafts with preview and new-order alerts on the owner’s phone.',
    result: 'Live at anniethreads.com, built in about five weeks. A new piece is on sale at its own address the moment it is saved.',
    link: { label: 'anniethreads.com', href: 'https://anniethreads.com' },
    screen: {
      tiles: [{ label: 'Orders today', value: '9' }, { label: 'To ship', value: '4' }, { label: 'Low stock', value: '3', warn: true }],
      orders: [{ no: '#2087', item: 'Dhakai saree · free size', status: 'Paid' }, { no: '#2086', item: 'Co-ord set · M', status: 'Shipped' }],
    },
  },
  {
    code: 'CF-03', kind: 'flow', example: false,
    title: 'Counter billing for a uniform shop', sector: 'Uniform shop · Billing app', stack: 'React · Google Sheets · Apps Script',
    problem: 'Bills were written by hand at a crowded counter, and prices lived in someone’s head.',
    built: 'A billing app for iPad and phone. Prices come from a Google Sheet the family edits, and each bill goes to WhatsApp or the printer.',
    flow: [{ t: 'tap item + size' }, { t: 'bill adds up', hot: true }, { t: 'save, even offline' }, { t: 'WhatsApp or print ✓', hot: true }],
    result: 'A bill saves the moment you tap, even with no signal, and is never saved twice. Past bills are there by day, week or month.',
  },
  {
    code: 'CF-04', kind: 'chat', example: false,
    title: 'WhatsApp assistant for clinics', sector: 'Small clinics · WhatsApp bot + dashboard', stack: 'Python · FastAPI · Twilio · SQLite',
    problem: 'Reception spent the day answering the same calls about timings, bookings and reports.',
    built: 'A WhatsApp assistant where patients book or move visits, ask about timings, get reminders and receive report files. Staff run it from a simple dashboard.',
    result: 'One small server runs many clinics. Moving from Twilio to Meta’s own WhatsApp API is a settings change, not a rebuild.',
  },
  {
    code: 'CF-05', kind: 'flow', example: false,
    title: 'Incident triage agent', sector: 'Grocery e-commerce · AI automation', stack: 'Python · LangGraph · FastAPI · RAG',
    problem: 'Engineers spent hours reading logs to work out why an order flow had broken.',
    built: 'An AI agent that reads each alert, finds similar past incidents, works out the cause and suggests the fix. When an alert is noise, it says so and does nothing.',
    flow: [{ t: 'alert fires' }, { t: 'past incidents found', hot: true }, { t: 'cause + fix' }, { t: 'engineer approves ✓', hot: true }],
    result: 'Manual log triage dropped from about two hours to fifteen minutes.',
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

export const topics = ['Website', 'Mobile app', 'Online store', 'WhatsApp bot', 'Clinic bot & CRM', 'AI automation', 'PLC & automation', 'Small job / fix', 'Not sure yet'];
export const budgetChoices = ['Not sure', 'Tiny', 'Small', 'Medium', 'Large'];

// Privacy policy at /privacy. Google needs this link to publish the booking app.
export const privacy = {
  updated: '1 November 2026',
  intro: 'This page explains what Cross-Connect Labs collects when you use crossconnectlabs.com and what we do with it. In short: only what you send us, and only to reply to you.',
  sections: [
    {
      title: 'What we collect',
      text: [
        'Contact form. The form stores nothing on this site. It opens WhatsApp or your email app with your message typed in, and you decide whether to send it. What you send then sits in our WhatsApp or email.',
        'Call booking. When you book a call we receive your name, your email address, the time you picked and any note you add. They are saved as an event in our Google Calendar, and Google emails you an invite with a Google Meet link.',
        'Hosting. The site runs on Cloudflare. Like any web host, Cloudflare processes technical data such as your IP address and browser type to deliver pages and protect the site.',
        'Your browser. We remember your day or night choice in your browser’s local storage. There are no cookies, no analytics and no advertising trackers.',
      ],
    },
    {
      title: 'How we use it',
      text: ['Only to reply to you, to arrange and hold the call, and to work on your project. We don’t sell it, share it for marketing or add you to mailing lists.'],
    },
    {
      title: 'Who else handles it',
      text: ['Google (Calendar and Meet) for booked calls, Meta (WhatsApp) if you message us there, and Cloudflare for hosting and email forwarding. Each follows its own privacy policy.'],
    },
    {
      title: 'Google user data',
      text: [
        'The booking system uses the Google Calendar API on our own Google account only, to see when we are free and to add the calls you book. It never signs in to or reads your Google account.',
        'Our use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.',
      ],
      link: { label: 'Google API Services User Data Policy', href: 'https://developers.google.com/terms/api-services-user-data-policy' },
    },
    {
      title: 'How long we keep it',
      text: ['Calendar events and messages stay with us for as long as we need them to work with you. Ask, and we’ll delete them.'],
    },
    {
      title: 'Your choices',
      text: ['You can ask what we hold about you, and ask us to correct or delete it. Email us at the address below.'],
    },
    {
      title: 'Changes',
      text: ['If this policy changes, we’ll update this page and the date at the top.'],
    },
  ],
};
