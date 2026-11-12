// All editable site content lives here. Replace every [bracketed] value before launch.

export const site = {
  name: 'Cross-Connect Labs',
  // Read inside sentences: "We reply within 12 hours with the cost."
  replyTime: '12 hours',
  // The short form in the header's "online" light.
  replyShort: '<12 hrs',
  // Shown as a badge in the hero. Set to '' to hide it.
  availability: '',
  title: 'Cross-Connect Labs · Websites, apps, WhatsApp bots and automation',
  // About 155 characters, so search results show all of it.
  description:
    'Websites, mobile apps, online stores, WhatsApp bots, clinic CRMs, AI and workflow automation from a small studio of engineers. No minimum budget.',
  // Describes public/og-image.png for screen readers when the link is shared.
  imageAlt: 'Cross-Connect Labs: Plug in your problem. We’ll wire the fix. No minimum budget.',
  // Search structured data (src/pages/index.astro). Other spellings people may type for the name.
  altNames: ['Cross Connect Labs', 'CrossConnect Labs'],
  // Where we take clients. Add a city here, and to `address` in index.astro, once there's an office.
  areaServed: 'India',
  // Full URLs of our profiles (LinkedIn, GitHub, Instagram…). Search engines use them to tie
  // the profiles to this site. Leave empty until they exist.
  profiles: [] as string[],
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
  // The call button in the sticky header. Phones show `hurryCta` in the bottom call bar instead.
  hurry: 'In a hurry?',
  hurryCta: 'Book a call',
  // Opens the call dialog's description.
  covered: 'Whatever the rush, we’ve got you covered.',
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

// Services section heading. The modules themselves are in `modules` below.
export const rack = {
  label: 'Our services · what we build',
  heading: 'The Rack.',
  intro: 'Everything we build, racked up as eight modules and run by one team. Each one plugs into the others, so your website, bot and automations share one signal path. Pick a module and patch in.',
};

// The scrolling strip under the hero: where the team has worked. Each group gets its own
// label-tape tag when there's more than one; `live: true` lights the LED on that group's cards.
// Clients can come back as a second group, e.g. { tag: 'live for', live: true, items: [...] }.
export const patchedIn = {
  label: 'Our team’s experience includes',
  caption: 'Engineers from TCS, AtkinsRéalis, Salesforce, KPMG and PwC, now building stores, apps, WhatsApp bots and automation for businesses of any size.',
  groups: [
    {
      tag: 'worked at',
      live: false,
      items: [
        { name: 'TCS', note: 'Tata Consultancy Services' },
        { name: 'AtkinsRéalis', note: 'engineering' },
        { name: 'Salesforce', note: 'CRM software' },
        { name: 'KPMG', note: 'data engineering' },
        { name: 'PwC', note: 'AI engineering' },
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

// Phones only: the menu sheet behind the header's menu button, the call bar that appears at the
// bottom once the hero has scrolled away, and the hero's one-line intro.
export const phone = {
  menu: 'menu',
  menuHeading: 'Patch to',
  contact: { href: '#contact', label: 'contact' },
  send: 'Patch in',
  lede: 'Tap your problem, see the fix, flip to send.',
  rackIntro: 'Eight modules, one team. Tap one to see what it does.',
  reportsHint: 'Swipe for more',
};

// Hero patch bay: pick a problem on the left and the card on the right shows the fix we'd build.
// `does` is the card's one-line description.
export const patchHeads = { problem: 'What’s going wrong?', fix: 'We’d build', send: 'Flip to send', book: 'Flip to book' };

export const patches = [
  { problem: 'Too many calls', fix: 'WhatsApp bot', topic: 'WhatsApp bot', time: '1–3 weeks', does: 'Answers questions and takes bookings for you, day and night.' },
  { problem: 'Orders on paper', fix: 'Online store', topic: 'Online store', time: '3–6 weeks', does: 'Customers order and pay online, and every order lands in one place.' },
  { problem: 'No website yet', fix: 'Website', topic: 'Website', time: '1–3 weeks', does: 'Customers find you on Google and get in touch.' },
  { problem: 'Typing invoices', fix: 'AI automation', topic: 'AI automation', time: '1–3 weeks', does: 'Reads your bills and fills in the invoices for you to check.' },
  { problem: 'Same tasks every day', fix: 'Workflow automation', topic: 'Workflow automation', time: '1–2 weeks', does: 'Your apps and sheets talk to each other, so reports, reminders and follow-ups run on their own.' },
];

// Phones only: a sixth key for visitors who don't know what they need. Flipping it opens the call dialog.
export const patchUnsure = {
  problem: 'Not sure yet',
  fix: 'A free call',
  time: `${booking.minutes} min`,
  tail: 'free',
  does: 'Tell us what’s slowing you down and we’ll work out the fix together.',
};

export const modules = [
  { code: 'MOD-01 · WEB', slug: 'websites', name: 'Websites', time: '1–3 wks', topic: 'Website', desc: 'Business sites and landing pages that load fast and are easy to update.' },
  { code: 'MOD-02 · APP', slug: 'web-apps', name: 'Web apps & dashboards', time: '3–8 wks', topic: 'Website', desc: 'Customer portals, dashboards and internal tools with logins and roles.' },
  { code: 'MOD-03 · MOB', slug: 'mobile-apps', name: 'Mobile apps', time: '4–10 wks', topic: 'Mobile app', desc: 'Android and iOS from one codebase, with payments and notifications.' },
  { code: 'MOD-04 · SHOP', slug: 'online-stores', name: 'Online stores', time: '3–6 wks', topic: 'Online store', desc: 'Payments, stock and an admin panel you run yourself.' },
  { code: 'MOD-05 · WA', slug: 'whatsapp-bots', name: 'WhatsApp bots', time: '1–3 wks', topic: 'WhatsApp bot', desc: 'Answers, bookings and order updates on WhatsApp, with hand-over to you.' },
  { code: 'MOD-06 · CRM', slug: 'clinic-crm', name: 'Clinic bot & CRM', time: '3–6 wks', topic: 'Clinic bot & CRM', desc: 'Appointments, reminders and patient records. No medical advice, urgent messages go to staff.' },
  { code: 'MOD-07 · AI', slug: 'ai-automation', name: 'AI automation', time: '1–3 wks', topic: 'AI automation', desc: 'AI that reads emails and documents, fills sheets and drafts replies, with you approving.' },
  { code: 'MOD-08 · FLOW', slug: 'workflow-automation', name: 'Workflow automation', time: '1–2 wks', topic: 'Workflow automation', desc: 'Connect Sheets, CRM, WhatsApp and email so reports, reminders and follow-ups run on their own.' },
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

// Service pages at /services/<slug>/ (src/pages/services/[slug].astro), one per module above.
// `heading` is the page's h1 and `title` its search result title, so both say plainly what it is.
// `description` is about 155 characters. `cases` are case file codes from `cases` above.
export const servicePage = {
  crumb: 'services',
  spec: 'spec sheet',
  buildTime: 'build time',
  budget: 'budget',
  budgetValue: 'no minimum',
  handover: 'hand-over',
  handoverValue: 'code + logins',
  includes: 'What we wire up',
  fits: 'Good fit if',
  cases: 'From the case files',
  casesLink: 'see all case files',
  faq: 'Troubleshooting.',
  patchIn: 'patch in',
  others: 'Other modules in the rack',
};

export const services = [
  {
    slug: 'websites',
    heading: 'Business websites that load fast',
    title: 'Business websites and landing pages · Cross-Connect Labs',
    description: 'Fast business websites and landing pages that show up on Google and are easy to update. Built in 1–3 weeks by a small team of engineers. No minimum budget.',
    intro: 'A website is often the first place a customer checks before they call. We build sites that load fast on a phone, show up on Google and turn a visit into a WhatsApp message, a call or an enquiry.',
    includes: [
      'One page or many: services, work, pricing, contact',
      'Fast on phones, with search basics set up: titles, sitemap, Google Search Console',
      'WhatsApp, call and enquiry buttons that reach you straight away',
      'Day and night modes, readable type and real buttons for every visitor',
      'Text and photos you can change yourself, or send to us',
      'Hosting set up on your own account, with your own domain and email',
    ],
    fits: ['You have no website yet, or one you can’t update', 'Customers ask the same things before they call', 'You want to be found on Google in your area'],
    cases: ['CF-02', 'CF-01'],
    faqs: [
      { q: 'Will it show up on Google?', a: 'We set up the basics Google needs: page titles, descriptions, a sitemap and Search Console. Ranking takes time and depends on your area and competition, so we won’t promise a position. A fast, clear site gives you the best start.' },
      { q: 'Can I change the text myself?', a: 'Yes. We can set up a simple way to edit text and photos, or you can send changes to us. Small edits in the first 30 days are free.' },
      { q: 'Do I need to buy hosting?', a: 'Usually not much. Most business sites run on free or very cheap hosting. You pay for the domain name, about a thousand rupees a year, and it is in your name.' },
    ],
  },
  {
    slug: 'web-apps',
    heading: 'Web apps, portals and dashboards',
    title: 'Web apps, customer portals and dashboards · Cross-Connect Labs',
    description: 'Customer portals, admin dashboards and internal tools with logins and roles. Built in 3–8 weeks by a small team of engineers. No minimum budget.',
    intro: 'When a spreadsheet stops keeping up, a small web app takes over. We build portals, dashboards and internal tools that open in any browser, with logins and roles so each person sees what they need.',
    includes: [
      'Logins with roles: owner, staff, customer',
      'Dashboards with the numbers you check every day',
      'Forms and records that replace sheets and paper',
      'Works on a phone, a tablet and a desktop',
      'Exports to Excel or PDF, and links to Google Sheets',
      'Built in stages, with a working version early',
    ],
    fits: ['Your team shares one overloaded spreadsheet', 'Customers keep asking for updates you could show them', 'You want one screen with today’s numbers'],
    cases: ['CF-03', 'CF-04'],
    faqs: [
      { q: 'Web app or mobile app?', a: 'A web app opens in any browser, needs no app store and is cheaper to build and change. Choose a mobile app when you need push notifications, offline use or a place on the home screen. We’ll tell you which fits.' },
      { q: 'Can it use my existing Google Sheet?', a: 'Yes. We can keep the sheet as the place you edit prices or records, and build the app on top of it, as we did for a uniform shop’s billing app.' },
      { q: 'Who can see the data?', a: 'Only the people you add. Each role sees its own screens, and the data stays in accounts that belong to you.' },
    ],
  },
  {
    slug: 'mobile-apps',
    heading: 'Mobile apps for Android and iOS',
    title: 'Mobile app development for Android and iOS · Cross-Connect Labs',
    description: 'Android and iOS apps from one codebase, with sign-in, payments and push notifications. Built in 4–10 weeks by a small team of engineers. No minimum budget.',
    intro: 'An app puts your business on your customer’s home screen. We build Android and iOS apps from one codebase, so you pay for one build, and we handle the store listings too.',
    includes: [
      'One codebase for Android and iOS',
      'Sign-in with Google or a phone OTP',
      'Online payments, including Razorpay and Cash on Delivery',
      'Push notifications for orders, bookings and reminders',
      'An admin panel to run products, prices and content',
      'Play Store and App Store listings, under your account',
    ],
    fits: ['Customers order from you again and again', 'You need alerts that reach people’s phones', 'Your website already works and you want the next step'],
    cases: ['CF-01'],
    faqs: [
      { q: 'Do I need both Android and iOS?', a: 'Not always. In India most customers use Android, so many businesses start there. Because we build from one codebase, adding iOS later is a smaller job.' },
      { q: 'How long does the store review take?', a: 'Google Play usually takes a few days, and new accounts need a short closed test first. Apple usually takes one to three days. We plan for both in the timeline.' },
      { q: 'Can the app share data with my website?', a: 'Yes. The app and the website can use the same orders, products and accounts, so you run everything from one admin panel.' },
    ],
  },
  {
    slug: 'online-stores',
    heading: 'Online stores you run yourself',
    title: 'Online store development with Razorpay · Cross-Connect Labs',
    description: 'Online stores with Razorpay payments, stock and an admin panel you run yourself. Built in 3–6 weeks by a small team of engineers. No minimum budget.',
    intro: 'We build online stores that you run, not us. Customers browse, pay with Razorpay or Cash on Delivery and track their order. You change prices, stock and offers from your own admin panel.',
    includes: [
      'Products with sizes, colours and collections',
      'Razorpay, UPI and Cash on Delivery',
      'Coupons, offers and monthly plans',
      'Order tracking for customers, new-order alerts for you',
      'An admin panel for orders, stock, couriers and pages',
      'No monthly platform fee: the store runs on your own account',
    ],
    fits: ['Orders come in by phone or WhatsApp and get lost', 'You pay a platform fee on every sale', 'You want to change stock and prices without a developer'],
    cases: ['CF-01', 'CF-02'],
    faqs: [
      { q: 'Why not use Shopify?', a: 'Shopify is a good choice for many shops, and we’ll say so if it fits. A store of your own has no monthly fee or per-sale cut, and can do things a template can’t, like daily milk plans.' },
      { q: 'How do payments reach me?', a: 'Through your own Razorpay account, straight to your bank. We help you set it up. We never hold your money.' },
      { q: 'Can I add products myself?', a: 'Yes. A new product is on sale the moment you save it in the admin panel, with its own page that Google can find.' },
    ],
  },
  {
    slug: 'whatsapp-bots',
    heading: 'WhatsApp bots for business',
    title: 'WhatsApp bots for bookings and customer questions · Cross-Connect Labs',
    description: 'WhatsApp bots that answer questions, take bookings and send order updates, then hand over to you. Built in 1–3 weeks. No minimum budget.',
    intro: 'Your customers are already on WhatsApp. A bot answers the questions you get every day, takes bookings, sends reminders and order updates, and hands the chat to you when a person is needed.',
    includes: [
      'Answers to common questions: timings, prices, location',
      'Bookings and reschedules, with reminders before the visit',
      'Order updates and files such as bills or reports',
      'Hand-over to your staff from a simple dashboard',
      'Built on the official WhatsApp Business API',
      'Replies in the languages your customers use',
    ],
    fits: ['Your phone rings all day with the same questions', 'Customers miss appointments', 'You want replies at night and on holidays'],
    cases: ['CF-04'],
    faqs: [
      { q: 'Will my number be banned?', a: 'No. We use the official WhatsApp Business API from Meta, not unofficial tools that get numbers blocked. Messages follow Meta’s rules on templates and opt-in.' },
      { q: 'What does WhatsApp itself cost?', a: 'Meta charges for some messages you send first, such as reminders. Replies within 24 hours of a customer’s message are free. We work out the cost for your case before you start.' },
      { q: 'Can a person take over the chat?', a: 'Yes. Your staff see every chat in a dashboard and can step in at any time. The bot stops replying while a person is in the chat.' },
    ],
  },
  {
    slug: 'clinic-crm',
    heading: 'Clinic WhatsApp bot and patient CRM',
    title: 'Clinic appointment bot and patient CRM · Cross-Connect Labs',
    description: 'A WhatsApp bot for clinic appointments and reminders, with a simple patient CRM for staff. No medical advice; urgent messages go to staff. No minimum budget.',
    intro: 'Reception spends the day answering the same calls. A clinic bot books and moves appointments on WhatsApp, sends reminders and report files, and keeps patient records in one place for your staff.',
    includes: [
      'Booking, rescheduling and cancelling on WhatsApp',
      'Reminders before each visit, to cut no-shows',
      'Report files and bills sent on WhatsApp',
      'A patient list with visit history for staff',
      'Urgent messages go straight to a person',
      'No medical advice from the bot, ever',
    ],
    fits: ['Reception is always on the phone', 'Patients miss or forget appointments', 'Records live in a register or many sheets'],
    cases: ['CF-04'],
    faqs: [
      { q: 'Does the bot give medical advice?', a: 'No. It books, reminds and answers questions like timings and fees. Anything about symptoms or anything urgent goes straight to your staff.' },
      { q: 'Where is patient data kept?', a: 'In accounts that belong to the clinic, and only your staff can see it. Tell us your rules and we’ll build to them.' },
      { q: 'Can it run several clinics or doctors?', a: 'Yes. One system can run many clinics, each with its own doctors, timings and staff.' },
    ],
  },
  {
    slug: 'ai-automation',
    heading: 'AI automation for documents, emails and support',
    title: 'AI automation for documents, emails and support · Cross-Connect Labs',
    description: 'AI that reads emails and documents, fills sheets and drafts replies, while you approve. Built in 1–3 weeks by a small team of engineers. No minimum budget.',
    intro: 'Much of office work is reading something and typing it somewhere else. We build AI that reads emails, bills and documents, fills your sheets and drafts replies, and leaves the final say to you.',
    includes: [
      'Reads bills, invoices and forms, and fills the data in',
      'Drafts email and chat replies for you to approve',
      'Sorts and tags incoming messages and tickets',
      'Searches your own documents and past cases for answers',
      'A person approves before anything important is sent',
      'Runs on your accounts, with your data kept private',
    ],
    fits: ['Someone types data from documents into a sheet', 'Your inbox has the same kinds of questions every day', 'Your team searches old records to solve new problems'],
    cases: ['CF-05'],
    faqs: [
      { q: 'Will the AI make mistakes?', a: 'Sometimes, which is why a person checks before anything important goes out. We start where a mistake is cheap to catch, and measure how often it is right.' },
      { q: 'Is my data used to train the AI?', a: 'We use AI services set up so your data is not used to train their models, and we keep your documents in your own accounts.' },
      { q: 'What does the AI cost to run?', a: 'A monthly bill that grows with use, usually small for a small business. We estimate it before we build, so there are no surprises.' },
    ],
  },
  {
    slug: 'workflow-automation',
    heading: 'Workflow automation for Sheets, CRM, WhatsApp and email',
    title: 'Workflow automation for Sheets, CRM, WhatsApp and email · Cross-Connect Labs',
    description: 'Connect Google Sheets, your CRM, WhatsApp and email so reports, reminders and follow-ups run on their own. Built in 1–2 weeks. No minimum budget.',
    intro: 'If you copy the same data between apps every day, it can run on its own. We connect Google Sheets, your CRM, WhatsApp and email so reports, reminders and follow-ups happen without anyone pressing a button.',
    includes: [
      'Data moves between Sheets, CRM and forms by itself',
      'Daily or weekly reports land in your inbox or WhatsApp',
      'Reminders and follow-ups go out on time',
      'New enquiries reach the right person straight away',
      'Alerts when something needs a human',
      'Built on tools you already use where we can',
    ],
    fits: ['You copy and paste between apps every day', 'Follow-ups slip through the cracks', 'Making the weekly report takes an afternoon'],
    cases: ['CF-03'],
    faqs: [
      { q: 'Do I need new software?', a: 'Often not. We start with what you already use, such as Google Sheets, Gmail and WhatsApp, and add only what is missing.' },
      { q: 'What if something breaks?', a: 'Every automation tells you when it fails, so nothing breaks quietly. The first 30 days of fixes are free.' },
      { q: 'Which task should we start with?', a: 'The one that eats the most hours each week. We look at your day with you and pick it together.' },
    ],
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

// Field reports: short notes on what our builds have done, taken from real projects. No client quotes.
export const reports = [
  { tag: 'REPORT · ONLINE STORE', title: 'Checkout live in ten days', text: 'A local shop moved from phone orders to online payments and monthly plans, and runs prices and stock from its own admin panel.' },
  { tag: 'REPORT · AI AUTOMATION', title: 'Two hours of digging, now fifteen minutes', text: 'An AI agent reads each alert, finds similar past cases and suggests the fix. Engineers approve instead of searching logs.' },
  { tag: 'REPORT · WHATSAPP BOT', title: 'The same questions, answered on WhatsApp', text: 'Bookings, timings, reminders and report files go through WhatsApp, and staff step in from a simple dashboard when needed.' },
  { tag: 'REPORT · BILLING APP', title: 'Hand-written bills, gone', text: 'A busy counter bills on a phone or iPad. Each bill saves the moment it is tapped, even with no signal, and goes to WhatsApp or print.' },
  { tag: 'REPORT · STOREFRONT', title: 'Run by the owner, not a developer', text: 'Collections, stock by size, couriers and new-order alerts on the owner’s phone. A new piece is on sale the moment it is saved.' },
  { tag: 'REPORT · HAND-OVER', title: 'Everything is yours at the end', text: 'Code, logins and a short walkthrough video at hand-over, then 30 days of free fixes. No lock-in.' },
];

export const faqs = [
  { q: 'Is there a minimum budget?', a: 'No. Small jobs are welcome. Tell us what you can spend and we will tell you honestly what we can do for it.' },
  { q: 'How do you decide the price?', a: 'We look at what you need, how long it will take and your budget. Then you get one clear price before we start, with no hidden costs.' },
  { q: 'How long does it take?', a: 'Small jobs take a few days. Websites take 1–3 weeks. Apps, online stores and bots usually take 2–10 weeks, depending on features.' },
  { q: 'Can I manage the store or app myself?', a: 'Yes. Online stores and apps come with an admin panel where you change products, orders, prices and content without needing us.' },
  { q: 'Is the clinic bot safe for patient data?', a: 'The bot books appointments, sends reminders and answers common questions. It gives no medical advice and sends urgent messages to your staff. Patient data stays in your accounts. [Add how you handle data protection.]' },
  { q: 'Who owns the work?', a: 'You do. At hand-over you get the code, the logins and a short walkthrough video.' },
  { q: 'What can you automate?', a: 'Most work you repeat on a computer: copying data between sheets and apps, sending reminders and follow-ups, building reports, reading documents and drafting replies. We start with the task that eats the most time.' },
  { q: 'Do you work with machines and factory systems too?', a: 'Yes. Our team includes electrical engineers, so we can take on PLC, SCADA and monitoring work as well, mostly remotely. Ask us about it.' },
];

export const topics = ['Website', 'Mobile app', 'Online store', 'WhatsApp bot', 'Clinic bot & CRM', 'AI automation', 'Workflow automation', 'PLC & automation', 'Small job / fix', 'Not sure yet'];
export const budgetChoices = ['Not sure', 'Tiny', 'Small', 'Medium', 'Large'];

// The visit log behind /admin (docs/analytics.md). The Worker deletes rows older than `keepDays`
// every night, and only accepts the action names below; the labels are what /admin shows.
export const visitLog = {
  keepDays: 90,
  // /admin looks like the 404 page until the key goes in.
  gate: {
    code: 'E404 · NO SIGNAL',
    heading: 'This cable isn’t plugged in.',
    hint: '…unless you brought a key.',
  },
  heading: 'Who patched in.',
  actions: {
    'contact-open': 'Contact form opened',
    'contact-send': 'Contact form sent',
    'book-open': 'Call dialog opened',
    'book-fallback': 'Booking offline, WhatsApp shown',
    booked: 'Call booked',
    whatsapp: 'WhatsApp link tapped',
    email: 'Email link clicked',
    phone: 'Phone number tapped',
    'copy-email': 'Email address copied',
    outbound: 'Outside link followed',
    // Gave up: the detail says how far they got, never what they typed.
    'contact-close': 'Contact form closed, not sent',
    'book-close': 'Call dialog closed, not booked',
    // The page's own controls, once per page each.
    'patch-pick': 'Fault finder: problem picked',
    'patch-flip': 'Fault finder: switch flipped',
    'knob-turn': 'Budget knob turned',
    'case-open': 'Case file opened',
    'faq-open': 'FAQ question opened',
    'rack-row': 'Service row opened (phone)',
    'service-link': 'Service page link',
    theme: 'Day/night switched',
    menu: 'Phone menu opened',
    'rage-click': 'Rage click',
    error: 'Error on the page',
  },
} as const;

// Privacy policy at /privacy. Google needs this link to publish the booking app.
export const privacy = {
  updated: '12 November 2026',
  intro: 'This page explains what Cross-Connect Labs collects when you use crossconnectlabs.com and what we do with it. In short: only what you send us, and only to reply to you.',
  sections: [
    {
      title: 'What we collect',
      text: [
        'Contact form. The form stores nothing on this site. It opens WhatsApp or your email app with your message typed in, and you decide whether to send it. What you send then sits in our WhatsApp or email.',
        'Call booking. When you book a call we receive your name, your email address, the time you picked and any note you add. They are saved as an event in our Google Calendar, and Google emails you an invite with a Google Meet link.',
        'Hosting. The site runs on Cloudflare. Like any web host, Cloudflare processes technical data such as your IP address and browser type to deliver pages and protect the site.',
        'Visits. We keep a simple log of visits, such as pages viewed, the type of device, the rough area (city level) and the network a visit came from, and how quickly the page loaded, to see how the site is used and where to improve it. It never includes what you type. It is not shared, and it is deleted after 90 days.',
        'Your browser. We remember your day or night choice in your browser’s local storage. There are no cookies and no advertising trackers.',
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
